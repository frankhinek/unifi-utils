// UniFi Controller Authentication Test with Secure Password Handling

const https = require('https');
const readline = require('readline');

// Configure these values for your environment
const UNIFI_CONFIG = {
  controller: 'unifi.openprotocol.xyz', // Your controller hostname/IP
  port: 8443,                           // Default UniFi controller port
  username: 'testadmin',                // Your UniFi admin username
  site: 'default',                      // Default site name
  insecure: true                        // Set to false if you have a valid SSL cert
};

// Function to prompt for password securely
function promptPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Use asterisks to mask the password
    let password = '';
    
    // Override the _writeToOutput function to hide the password
    const originalWrite = rl._writeToOutput;
    rl._writeToOutput = function(stringToWrite) {
      if (stringToWrite === rl.getPrompt() || stringToWrite.startsWith('Enter UniFi admin password:')) {
        originalWrite.call(this, stringToWrite);
      } else {
        // Write asterisks instead of the actual characters
        originalWrite.call(this, '*');
      }
    };
    
    rl.question('Enter UniFi admin password: ', (answer) => {
      password = answer;
      rl.close();
      // Add a newline after password input
      console.log('');
      resolve(password);
    });
    
    rl.on('line', (input) => {
      password = input;
      rl.close();
    });
  });
}

// Function to authenticate with UniFi Controller
async function authenticate(password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      username: UNIFI_CONFIG.username,
      password: password
    });

    console.log(`Attempting to authenticate to ${UNIFI_CONFIG.controller}:${UNIFI_CONFIG.port} with username: ${UNIFI_CONFIG.username}`);
    
    const options = {
      hostname: UNIFI_CONFIG.controller,
      port: UNIFI_CONFIG.port,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      rejectUnauthorized: !UNIFI_CONFIG.insecure // Allow self-signed certificates if insecure is true
    };

    const req = https.request(options, (res) => {
      console.log(`Login response status code: ${res.statusCode}`);
      
      if (res.statusCode !== 200) {
        reject(new Error(`Authentication failed with status ${res.statusCode}`));
        return;
      }

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          console.log('Response headers:', res.headers);
          console.log('Set-Cookie header present:', !!res.headers['set-cookie']);
          
          const cookies = res.headers['set-cookie'];
          
          // Test if we can get the sites list - this confirms our auth worked
          getSitesList(cookies)
            .then(sites => {
              console.log('\n✅ Authentication successful!');
              console.log('\nAvailable sites:');
              console.log('-'.repeat(80));
              console.log('ID                                     Name                 Description');
              console.log('-'.repeat(80));
              
              for (const site of sites) {
                console.log(`${site._id.padEnd(36)} ${site.name.padEnd(20)} ${site.desc}`);
              }
              
              resolve(cookies);
            })
            .catch(error => {
              console.error('\n❌ Authentication seemed to work but site verification failed:', error.message);
              reject(error);
            });
        } catch (error) {
          console.error('\n❌ Error processing response:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Connection error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Function to get the list of sites (to verify auth worked)
function getSitesList(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: UNIFI_CONFIG.controller,
      port: UNIFI_CONFIG.port,
      path: '/api/self/sites',
      method: 'GET',
      headers: {
        'Cookie': cookies
      },
      rejectUnauthorized: !UNIFI_CONFIG.insecure
    };

    console.log('\nAttempting to retrieve sites list to verify authentication...');

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Sites API responded with status ${res.statusCode}`));
        return;
      }

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.meta && response.meta.rc === 'ok') {
            // Return full site objects instead of just descriptions
            resolve(response.data);
          } else {
            reject(new Error(`UniFi API error: ${response.meta ? response.meta.msg : 'Unknown error'}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Function to test guest authorization (optional)
function testGuestAuth(cookies, clientMac) {
  return new Promise((resolve, reject) => {
    if (!clientMac) {
      console.log('\nSkipping guest authorization test (no MAC address provided)');
      resolve();
      return;
    }

    console.log(`\nAttempting to authorize guest MAC: ${clientMac}...`);
    
    const data = JSON.stringify({
      cmd: 'authorize-guest',
      mac: clientMac,
      minutes: 60, // Authorization duration (1 hour)
      name: 'Test Guest',
      email: 'test@example.com'
    });

    const options = {
      hostname: UNIFI_CONFIG.controller,
      port: UNIFI_CONFIG.port,
      path: `/api/s/${UNIFI_CONFIG.site}/cmd/stamgr`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Cookie': cookies
      },
      rejectUnauthorized: !UNIFI_CONFIG.insecure
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Guest auth API responded with status ${res.statusCode}`));
        return;
      }

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.meta && response.meta.rc === 'ok') {
            console.log('✅ Guest authorization successful!');
            resolve();
          } else {
            reject(new Error(`UniFi API error: ${response.meta ? response.meta.msg : 'Unknown error'}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main function to run the test
async function main() {
  console.log('UniFi Controller Authentication Test\n' + '='.repeat(35));

  // Optional: You can pass a MAC address as a command line argument to test guest authorization
  const testMac = process.argv[2];
  if (testMac) {
    console.log(`Will test guest authorization for MAC: ${testMac}`);
  }

  try {
    // Prompt for password
    const password = await promptPassword();
    
    // Authenticate
    const cookies = await authenticate(password);
    
    // Test guest authorization if MAC address provided
    await testGuestAuth(cookies, testMac);
    
    console.log('\nAll tests completed successfully! ✅');
    process.exit(0);
  } catch (error) {
    console.error('\nTest failed! ❌');
    console.error(error);
    process.exit(1);
  }
}

// Run the program
main();