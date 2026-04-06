# ──────────────────────────────────────────────────────────────────────────────
# AWS Cognito User Pool -- SSO/SAML Authentication
# Supports: local username/password, SAML 2.0 federation, OIDC
# Health systems add their IdP (Active Directory, Okta, Azure AD) as SAML providers
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-users"

  # Username is email
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy (HIPAA-aligned)
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 1
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"  # Required for HIPAA -- users can enable TOTP
  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Schema: custom attributes for TAILRD
  schema {
    name                = "hospitalId"
    attribute_data_type = "String"
    mutable             = true
    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  # Email configuration (use SES in production)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Advanced security (adaptive authentication)
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  tags = merge(local.common_tags, {
    Name      = "${local.name_prefix}-cognito-user-pool"
    Component = "Authentication"
    DataClass = "PHI"
  })
}

# ─── App Client (backend API) ────────────────────────────────────────────────

resource "aws_cognito_user_pool_client" "api" {
  name         = "${local.name_prefix}-api-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # No client secret for public SPA clients
  generate_secret = false

  # OAuth2 flows
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]

  # Callback URLs
  callback_urls = [
    "https://app.${var.domain_name}/auth/callback",
    "http://localhost:3000/auth/callback",  # Local dev
  ]
  logout_urls = [
    "https://app.${var.domain_name}/login",
    "http://localhost:3000/login",
  ]

  # Token validity
  access_token_validity  = 1   # 1 hour (HIPAA short-lived)
  id_token_validity      = 1   # 1 hour
  refresh_token_validity = 24  # 24 hours

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "hours"
  }

  # Prevent user existence errors (security)
  prevent_user_existence_errors = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]
}

# ─── Domain (hosted UI for SSO login) ────────────────────────────────────────

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

# NOTE: SAML Identity Providers are added per-hospital via AWS CLI or console:
#
#   aws cognito-idp create-identity-provider \
#     --user-pool-id <POOL_ID> \
#     --provider-name "MedicalCityDallas" \
#     --provider-type SAML \
#     --provider-details '{"MetadataURL":"https://their-idp.example.com/metadata.xml"}' \
#     --attribute-mapping '{"email":"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"}'
#
# Then add the provider name to the app client's supported_identity_providers list.
