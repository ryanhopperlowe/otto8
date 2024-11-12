# Workspace Provider

In Otto8, a workspace is where files are stored and manipulated by a user. By default, any workspace is a directory on local disk. However, is some server-based applications, this is not acceptable. The concept of a workspace provider is used to abstract away the concept of a workspace and use other options.

This section describes the configuration of the workspace provider.

#### `OTTO8_WORKSPACE_PROVIDER_TYPE`

The type of provider to use. The current options are `directory` or `s3`. Note that the `s3` provider is compatible with s3-compatible services like CloudFlare R2.

### The directory provider configuration

#### `WORKSPACE_PROVIDER_DATA_HOME`

Specify the directory where workspaces are nested. The default is `$XDG_CONFIG_HOME/otto8/workspace-provider`.

### The s3 provider configuration

#### `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `WORKSPACE_PROVIDER_S3_BUCKET`

These variables configure the s3 or s3-compatible access and bucket to use with the workspace provider.

#### `WORKSPACE_PROVIDER_S3_BASE_ENDPOINT`

This is necessary for using an s3-compatible service like CloudFlare R2.