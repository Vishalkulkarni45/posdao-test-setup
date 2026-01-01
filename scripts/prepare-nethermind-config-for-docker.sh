#!/bin/bash

# Update Nethermind config files to use Docker-compatible absolute paths

echo "Updating Nethermind configuration files for Docker..."

for i in $(seq 0 6); do
    CONFIG_FILE="./config/node${i}.nethermind.json"
    
    # Update ChainSpecPath
    sed -i 's|"ChainSpecPath": "./data/spec.json"|"ChainSpecPath": "/nethermind/data/spec.json"|' "$CONFIG_FILE"
    
    # Update BaseDbPath
    sed -i "s|\"BaseDbPath\": \"./data/node${i}\"|\"BaseDbPath\": \"/nethermind/data/node${i}\"|" "$CONFIG_FILE"
    
    # Update LogDirectory
    sed -i "s|\"LogDirectory\": \"./data/node${i}\"|\"LogDirectory\": \"/nethermind/data/node${i}\"|" "$CONFIG_FILE"
done

echo "Configuration files updated successfully"
