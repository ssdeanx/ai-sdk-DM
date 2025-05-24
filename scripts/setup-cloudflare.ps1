# ==============================================================================
# Cloudflare Setup Script for Windows PowerShell
# ==============================================================================
# This script sets up all required Cloudflare services for the ai-sdk-dm project.
# Run this script after installing dependencies and configuring your .env.local file.
# ==============================================================================

param(
    [switch]$SkipLogin,
    [switch]$Force,
    [switch]$LocalOnly
)

# Set error action preference
$ErrorActionPreference = "Continue"

# Colors for output
$Colors = @{
    Green = "Green"
    Red = "Red" 
    Yellow = "Yellow"
    Cyan = "Cyan"
    Blue = "Blue"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

Write-ColorOutput "🚀 Setting up Cloudflare services for ai-sdk-dm..." "Green"
Write-ColorOutput ""

# Check if wrangler is installed
try {
    $wranglerVersion = wrangler --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Wrangler CLI found: $wranglerVersion" "Green"
    } else {
        throw "Wrangler not found"
    }
} catch {
    Write-ColorOutput "❌ Wrangler CLI not found. Installing globally..." "Red"
    try {
        pnpm install -g wrangler
        Write-ColorOutput "✅ Wrangler CLI installed successfully" "Green"
    } catch {
        Write-ColorOutput "❌ Failed to install Wrangler CLI. Please run: pnpm install -g wrangler" "Red"
        exit 1
    }
}

# Check if user is logged in to Cloudflare
if (-not $SkipLogin) {
    Write-ColorOutput "🔐 Checking Cloudflare authentication..." "Yellow"
    try {
        $whoami = wrangler whoami 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Already logged in to Cloudflare: $whoami" "Green"
        } else {
            Write-ColorOutput "🔑 Please log in to Cloudflare..." "Yellow"
            wrangler login
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "❌ Failed to log in to Cloudflare" "Red"
                exit 1
            }
        }
    } catch {
        Write-ColorOutput "🔑 Please log in to Cloudflare..." "Yellow"
        wrangler login
    }
}

Write-ColorOutput ""
Write-ColorOutput "📦 Creating Cloudflare resources..." "Yellow"

# Store created resource IDs
$ResourceIds = @{}

# 1. Create D1 Database
Write-ColorOutput "1️⃣ Creating D1 Database..." "Cyan"
try {
    if ($Force) {
        Write-ColorOutput "🗑️ Force flag detected, attempting to delete existing database..." "Yellow"
        wrangler d1 delete ai-sdk-dm-d1 --force 2>$null
    }
    
    $d1Output = wrangler d1 create ai-sdk-dm-d1 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ D1 database 'ai-sdk-dm-d1' created successfully" "Green"
        
        # Extract database ID from output
        $d1Id = ($d1Output | Where-Object { $_ -match "database_id.*=.*\"(.+)\"" } | ForEach-Object { $Matches[1] }) -join ""
        if ($d1Id) {
            $ResourceIds["D1_DATABASE_ID"] = $d1Id
            Write-ColorOutput "📝 Database ID: $d1Id" "White"
        }
    } else {
        Write-ColorOutput "⚠️ D1 database creation failed or already exists:" "Yellow"
        Write-ColorOutput $d1Output "White"
    }
} catch {
    Write-ColorOutput "❌ Error creating D1 database: $_" "Red"
}

# 2. Create KV Namespace
Write-ColorOutput ""
Write-ColorOutput "2️⃣ Creating KV Namespace..." "Cyan"
try {
    $kvOutput = wrangler kv:namespace create "ai-sdk-dm-kv" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ KV namespace 'ai-sdk-dm-kv' created successfully" "Green"
        
        # Extract namespace ID from output
        $kvId = ($kvOutput | Where-Object { $_ -match "id.*=.*\"(.+)\"" } | ForEach-Object { $Matches[1] }) -join ""
        if ($kvId) {
            $ResourceIds["KV_NAMESPACE_ID"] = $kvId
            Write-ColorOutput "📝 Namespace ID: $kvId" "White"
        }
    } else {
        Write-ColorOutput "⚠️ KV namespace creation failed or already exists:" "Yellow"
        Write-ColorOutput $kvOutput "White"
    }
} catch {
    Write-ColorOutput "❌ Error creating KV namespace: $_" "Red"
}

# 3. Create R2 Bucket
Write-ColorOutput ""
Write-ColorOutput "3️⃣ Creating R2 Bucket..." "Cyan"
try {
    $r2Output = wrangler r2 bucket create ai-sdk-dm-files 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ R2 bucket 'ai-sdk-dm-files' created successfully" "Green"
        Write-ColorOutput "📝 Configure public access in Cloudflare Dashboard if needed" "Yellow"
        $ResourceIds["R2_BUCKET_NAME"] = "ai-sdk-dm-files"
    } else {
        Write-ColorOutput "⚠️ R2 bucket creation failed or already exists:" "Yellow"
        Write-ColorOutput $r2Output "White"
    }
} catch {
    Write-ColorOutput "❌ Error creating R2 bucket: $_" "Red"
}

# 4. Create Vectorize Index
Write-ColorOutput ""
Write-ColorOutput "4️⃣ Creating Vectorize Index..." "Cyan"
try {
    $vectorOutput = wrangler vectorize create ai-sdk-dm-vectors --dimensions=1536 --metric=cosine 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Vectorize index 'ai-sdk-dm-vectors' created successfully" "Green"
        Write-ColorOutput "📝 Index configured with 1536 dimensions (OpenAI embeddings) and cosine similarity" "Yellow"
        $ResourceIds["VECTORIZE_INDEX_NAME"] = "ai-sdk-dm-vectors"
    } else {
        Write-ColorOutput "⚠️ Vectorize index creation failed or already exists:" "Yellow"
        Write-ColorOutput $vectorOutput "White"
    }
} catch {
    Write-ColorOutput "❌ Error creating Vectorize index: $_" "Red"
}

# 5. Setup D1 Database Schema
Write-ColorOutput ""
Write-ColorOutput "5️⃣ Setting up D1 Database Schema..." "Cyan"
if (Test-Path "lib/database/cloudflare/d1/schema.ts") {
    Write-ColorOutput "📋 D1 schema found. Setting up Drizzle migrations..." "Yellow"
    
    try {
        # Generate migration
        Write-ColorOutput "🔄 Generating Drizzle migration..." "Yellow"
        pnpm exec drizzle-kit generate --config=drizzle.d1.config.ts
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Migration generated successfully" "Green"
            
            # Apply migration to local D1 unless LocalOnly is false
            if (-not $LocalOnly) {
                Write-ColorOutput "🚀 Applying migration to local D1 database..." "Yellow"
                wrangler d1 migrations apply ai-sdk-dm-d1 --local
                
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorOutput "✅ Local D1 schema migration completed successfully" "Green"
                } else {
                    Write-ColorOutput "⚠️ Local D1 migration failed" "Yellow"
                }
            }
        } else {
            Write-ColorOutput "⚠️ Migration generation failed" "Yellow"
        }
    } catch {
        Write-ColorOutput "⚠️ D1 migration error: $_" "Yellow"
        Write-ColorOutput "   You may need to run this manually:" "Yellow"
        Write-ColorOutput "   pnpm run cf:migrate:local" "Cyan"
    }
} else {
    Write-ColorOutput "⚠️ D1 schema not found at lib/database/cloudflare/d1/schema.ts" "Yellow"
}

# 6. Update wrangler.toml with generated IDs
Write-ColorOutput ""
Write-ColorOutput "6️⃣ Updating wrangler.toml configuration..." "Cyan"
if ($ResourceIds.Count -gt 0 -and (Test-Path "wrangler.toml")) {
    try {
        $wranglerContent = Get-Content "wrangler.toml" -Raw
        
        foreach ($key in $ResourceIds.Keys) {
            $value = $ResourceIds[$key]
            switch ($key) {
                "D1_DATABASE_ID" {
                    $wranglerContent = $wranglerContent -replace 'database_id = "YOUR_D1_DATABASE_ID"', "database_id = `"$value`""
                }
                "KV_NAMESPACE_ID" {
                    $wranglerContent = $wranglerContent -replace 'id = "YOUR_KV_NAMESPACE_ID"', "id = `"$value`""
                }
            }
        }
        
        Set-Content "wrangler.toml" $wranglerContent
        Write-ColorOutput "✅ wrangler.toml updated with generated IDs" "Green"
    } catch {
        Write-ColorOutput "⚠️ Failed to update wrangler.toml: $_" "Yellow"
    }
} else {
    Write-ColorOutput "⚠️ No resource IDs to update or wrangler.toml not found" "Yellow"
}

# 7. Create .env.local template if it doesn't exist
Write-ColorOutput ""
Write-ColorOutput "7️⃣ Checking environment configuration..." "Cyan"
if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-ColorOutput "✅ Created .env.local from .env.example template" "Green"
        Write-ColorOutput "📝 Please update .env.local with your actual values" "Yellow"
    } else {
        Write-ColorOutput "⚠️ No .env.example found to create .env.local" "Yellow"
    }
} else {
    Write-ColorOutput "✅ .env.local already exists" "Green"
}

Write-ColorOutput ""
Write-ColorOutput "🎉 Cloudflare setup completed!" "Green"
Write-ColorOutput ""

# Display summary
Write-ColorOutput "📋 Setup Summary:" "Yellow"
Write-ColorOutput "==================" "Yellow"
if ($ResourceIds.Count -gt 0) {
    foreach ($key in $ResourceIds.Keys) {
        Write-ColorOutput "  $key`: $($ResourceIds[$key])" "White"
    }
} else {
    Write-ColorOutput "  No new resources were created (may already exist)" "White"
}

Write-ColorOutput ""
Write-ColorOutput "📋 Next Steps:" "Yellow"
Write-ColorOutput "1. Verify wrangler.toml has the correct resource IDs" "White"
Write-ColorOutput "2. Update your .env.local with Cloudflare service IDs" "White"
Write-ColorOutput "3. Test your setup with: pnpm run cf:dev" "White"
Write-ColorOutput "4. Deploy to production with: pnpm run cf:deploy" "White"
Write-ColorOutput "5. Run migrations: pnpm run cf:migrate:local" "White"
Write-ColorOutput ""

Write-ColorOutput "🔧 Useful Commands:" "Yellow"
Write-ColorOutput "  pnpm run cf:login     - Login to Cloudflare" "Cyan"
Write-ColorOutput "  pnpm run cf:dev       - Start local development" "Cyan"
Write-ColorOutput "  pnpm run cf:deploy    - Deploy to production" "Cyan"
Write-ColorOutput "  pnpm run cf:migrate:local  - Run D1 migrations locally" "Cyan"
Write-ColorOutput "  pnpm run cf:migrate:remote - Run D1 migrations remotely" "Cyan"
Write-ColorOutput ""

Write-ColorOutput "📚 Documentation:" "Blue"
Write-ColorOutput "  Cloudflare Pages: https://developers.cloudflare.com/pages/" "Blue"
Write-ColorOutput "  D1 Database: https://developers.cloudflare.com/d1/" "Blue"
Write-ColorOutput "  Vectorize: https://developers.cloudflare.com/vectorize/" "Blue"
Write-ColorOutput ""

if ($ResourceIds.Count -gt 0) {
    Write-ColorOutput "💾 Resource IDs have been saved to the console output above." "Green"
    Write-ColorOutput "   Save these IDs in case you need them later!" "Yellow"
}