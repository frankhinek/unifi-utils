use clap::Parser;
use reqwest::{Client, header::{HeaderMap, HeaderValue, COOKIE, CONTENT_TYPE}};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::time::Duration;

// Command line arguments
#[derive(Parser, Debug)]
#[clap(author, version, about = "UniFi Controller Authentication Test")]
struct Args {
    #[clap(long, default_value = "unifi.openprotocol.xyz")]
    controller: String,

    #[clap(long, default_value = "8443")]
    port: u16,

    #[clap(long, default_value = "testadmin")]
    username: String,

    #[clap(long)]
    password: Option<String>,

    #[clap(long, default_value = "default")]
    site: String,

    #[clap(long)]
    insecure: bool,

    #[clap(long)]
    test_mac: Option<String>,
}

// Login request and response structures
#[derive(Serialize, Debug)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Deserialize, Debug)]
struct ApiResponse<T> {
    meta: Meta,
    data: Option<T>,
}

#[derive(Deserialize, Debug)]
struct Meta {
    rc: String,
    msg: Option<String>,
}

#[derive(Deserialize, Debug)]
struct Site {
    desc: String,
    #[serde(rename = "_id")]
    id: String,
    name: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Parse command line arguments
    let mut args = Args::parse();
    
    // If password is not provided via command line, prompt for it
    if args.password.is_none() {
        args.password = Some(
            rpassword::prompt_password("Enter UniFi admin password: ")?
        );
    }
    
    println!("UniFi Controller Authentication Test");
    println!("===================================");
    println!("Attempting to authenticate to {}:{} with username: {}", 
             args.controller, args.port, args.username);

    // Create HTTP client with proper SSL configuration
    let client_builder = Client::builder()
        .timeout(Duration::from_secs(30))
        .danger_accept_invalid_certs(args.insecure);
    
    let client = client_builder.build()?;

    // Authenticate with UniFi Controller
    let login_data = LoginRequest {
        username: args.username.clone(), // Clone here to avoid moving
        password: args.password.clone().unwrap(),
    };

    let login_url = format!("https://{}:{}/api/login", args.controller, args.port);
    
    let response = client.post(&login_url)
        .json(&login_data)
        .send()
        .await?;
    
    println!("Login response status code: {}", response.status());

    if !response.status().is_success() {
        return Err(format!("Authentication failed with status {}", response.status()).into());
    }

    // Extract cookies
    let cookies = if let Some(cookie_header) = response.headers().get("set-cookie") {
        println!("Set-Cookie header present: true");
        cookie_header.to_str()?
    } else {
        println!("Set-Cookie header present: false");
        return Err("No cookies received from server".into());
    };

    // Get sites list to verify authentication
    println!("\nAttempting to retrieve sites list to verify authentication...");
    
    let sites_url = format!("https://{}:{}/api/self/sites", args.controller, args.port);
    
    let mut headers = HeaderMap::new();
    headers.insert(COOKIE, HeaderValue::from_str(cookies)?);
    
    let sites_response = client.get(&sites_url)
        .headers(headers.clone())
        .send()
        .await?;
    
    if !sites_response.status().is_success() {
        return Err(format!("Sites API responded with status {}", sites_response.status()).into());
    }

    let sites_data: ApiResponse<Vec<Site>> = sites_response.json().await?;
    
    if sites_data.meta.rc != "ok" {
        return Err(format!("UniFi API error: {}", sites_data.meta.msg.unwrap_or_else(|| "Unknown error".to_string())).into());
    }

    println!("✅ Authentication successful!");
    
    // Print each site's details on a separate line
    println!("\nAvailable sites:");
    println!("{:<36} {:<20} {}", "ID", "Name", "Description");
    println!("{}", "-".repeat(80));
    
    if let Some(sites) = sites_data.data {
        for site in sites {
            println!("{:<36} {:<20} {}", site.id, site.name, site.desc);
        }
    } else {
        println!("No sites found");
    }

    // Test guest authorization if MAC address provided
    if let Some(mac) = args.test_mac.clone() {
        guest_auth_test(&client, &args, cookies, &mac).await?;
    } else {
        println!("\nSkipping guest authorization test (no MAC address provided)");
    }

    println!("\nAll tests completed successfully! ✅");
    Ok(())
}

async fn guest_auth_test(
    client: &Client, 
    args: &Args, 
    cookies: &str, 
    mac: &str
) -> Result<(), Box<dyn Error>> {
    println!("\nAttempting to authorize guest MAC: {}...", mac);
    
    let auth_url = format!("https://{}:{}/api/s/{}/cmd/stamgr", 
                           args.controller, args.port, args.site);
    
    let auth_data = serde_json::json!({
        "cmd": "authorize-guest",
        "mac": mac,
        "minutes": 60,
        "name": "Test Guest",
        "email": "test@example.com"
    });
    
    let mut headers = HeaderMap::new();
    headers.insert(COOKIE, HeaderValue::from_str(cookies)?);
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    
    let auth_response = client.post(&auth_url)
        .headers(headers)
        .json(&auth_data)
        .send()
        .await?;
    
    if !auth_response.status().is_success() {
        return Err(format!("Guest auth API responded with status {}", auth_response.status()).into());
    }
    
    let auth_result: ApiResponse<serde_json::Value> = auth_response.json().await?;
    
    if auth_result.meta.rc != "ok" {
        return Err(format!("UniFi API error: {}", auth_result.meta.msg.unwrap_or_else(|| "Unknown error".to_string())).into());
    }
    
    println!("✅ Guest authorization successful!");
    Ok(())
}