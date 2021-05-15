# Image Flex
A robust image resizing service built on AWS Serverless technologies and used to resize, optimize, and cache images on "the edge," on the fly. Served by [CloudFront](https://aws.amazon.com/cloudfront/) via an [Origin Access Identity](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html). Executed on [Lambda@Edge](https://aws.amazon.com/lambda/edge/). Backed by [S3](https://aws.amazon.com/s3/). Protected by [AWS WAF](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html). Provisioned via [CloudFormation](https://aws.amazon.com/cloudformation/). Built and deployed by the [Serverless Application Model (SAM)](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) CLI. 

Resized images will be converted to [WebP](https://developers.google.com/speed/webp) format if the image request includes a valid `Accepts` header with "webp" listed in its value.

The original inspiration for this application came from [this AWS blog post](https://aws.amazon.com/blogs/networking-and-content-delivery/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/) I read a few years back. The article intended to provide a [semi-]working example, which was far from being suitable for a production environment.

## Prerequisites
Note that this is a production-ready application, not a tutorial. This document assumes you have some working knowledge of AWS, [CloudFormation](https://aws.amazon.com/cloudformation/) and the [Serverless Application Model (SAM)](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html), [AWS Lambda](https://aws.amazon.com/lambda/), [S3](https://aws.amazon.com/s3/), [Node.js](https://nodejs.org/), [NPM](https://www.npmjs.com/), and JavaScript.

## Requirements
1. [Node.js v12.x](https://nodejs.org/en/blog/release/v12.22.1/) (this is the latest version supported by [Lambda@Edge](https://aws.amazon.com/lambda/edge/)). It's recommended to use [Node Version Manager](https://github.com/nvm-sh/nvm), which allows one system to install and switch between multiple Node.js versions.
1. An [AWS account](https://aws.amazon.com/account/sign-up).
1. The [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-macos.html)
1. The [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-mac.html)

Be sure to configure the AWS CLI:
```bash
$ aws configure
```
For detailed instructions on setting up the AWS CLI, read [the official AWS CLI documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html).

## Quickstart

Deploy the whole service in 2 commands! Run the `setup` and `update` NPM scripts, passing a name for your application. For a detailed explanation of these commands, see the section [Building and Deploying](#building-and-deploying).

```bash
$ npm run setup
$ npm run update
```

1. The `setup` NPM script will create the CloudFormation deployment bucket.
1. The `update` NPM script will build, package, and deploy the application stack to CloudFormation using the AWS SAM CLI. When the script is finished, it will print an "Outputs" section that includes the "DistributionDomain," which is the URL for your CloudFront distribution (e.g., `[Distro ID].cloudfront.net`). Note this value for later, as it is how you will access the service.

> These scripts take an optional argument to indicate the execution environment. Omitting this will result in the default of "dev" being used.

***Example:***

```bash
$ npm run setup -- staging
$ npm run update -- staging
```


## Usage

Using an Image Flex implementation is easy. Once the infrastructure has spun up, simply upload your raw, unoptimized images to the S3 bucket root. You can then access those files directly, or pass a `w` (width) query string parameter to fetch a resized and optimized copy, which also gets stored in the S3 bucket and cached in CloudFront.

***Example***

Suppose that you drop a 1600x900-pixel image named *myimage.png* into the created S3 bucket. You can now load this exact image in the browser via the distribution domain:

<sub>1600x900 pixels</sub>
```
https://[Distro ID].cloudfront.net/myimage.png
```
Using this full-resolution, unoptimized image would have negative performance impacts.

#### Resizing your images
**w parameter**

Now suppose that you want to load that image at 400 pixels width, maintaining the aspect ratio. It's as easy as adding the `?w=400` query string parameter.

<sub>400x225 pixels</sub>
```
https://[Distro ID].cloudfront.net/myimage.png?w=400
```
This will return a resized and optimized image (WebP, if supported by the browser).

**h parameter**

You can also add an `h` query string parameter to set the height. Note that changing the aspect ratio will clip the image (like `object-fit: cover` in CSS), not stretch or squash the image.

<sub>400x400 pixels, clipped</sub>
```
https://[Distro ID].cloudfront.net/myimage.png?w=400&h=400
```

## How It Works

![Alt text](/diagram.png?raw=true "Systen Diagram")

The fully actioned (built, packaged, and deployed) [SAM template](/template.yaml) will result in a CloudFormation *stack* of resources being created across numerous AWS services (see the following table). 

> Any named resources will have the name prepended with the name of the stack, which itself is assembled from the application (image-flex), your AWS account ID, and the execution environment ("dev" by default).
> **Example stack name:** `image-flex-412342973409-prod`
**Example S3 bucket name:** `image-flex-412342973409-prod-images`

| Resource Type | Resource Name | Description |
|---|---|---|
| [CloudFront Distribution](https://aws.amazon.com/cloudfront/) | N/A | Content Delivery Network (CDN) to cache images at locations closest to users. |
| [AWS WAF Web ACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html) | `[Stack Name]`-WebAcl | Defends the application from common web exploits by enforcing various access rules. This application implements AWS's [Core Rule Set](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html). |
| [S3 Bucket](https://aws.amazon.com/s3) | `[Stack Name]`-images | Serves as the CloudFront origin, storing the original image assets in the root, and resized image assets within subdirectories by width. |
| [Origin Access Identity](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) | N/A | Restricts direct access to the S3 bucket content, only allowing the CloudFront distribution to read and serve the image files.  |
| [Lambda@Edge](https://aws.amazon.com/lambda/edge/) | `[Stack Name]`-UriToS3Key | Responds to the "viewer request" CloudFront trigger, and will reformat the requested URI into a valid S3 key expected by the S3 bucket. Example: **/image.png?w=300** `=>` **/300/image.webp** |
| [Lambda@Edge](https://aws.amazon.com/lambda/edge/) | `[Stack Name]`-GetOrCreateImage | Responds to the "origin response" CloudFront trigger, and: <ol><li>If the requested image in the requested size is found, return it.</li><li>Otherwise, if the requested image in the requested size is not found, attempt to create an image in the requested size from the base image.</li><li>Otherwise, if the base image is not found, return *HTTP status 404: Not Found*.</li></ol> |

## Building and Deploying
The following NPM scripts are available:

1. setup
1. build
1. package
1. deploy
1. update

Each NPM script calls a shell script of the same name in the /bin directory.

### :information_source: Setting the execution environment

#### via environment variable
These scripts (except for build) all run within the context of an execution environment (e.g., dev, staging, prod, etc.). You can set the execution environment 

#### via the command line
Alternately, the `setup`, `package`, `deploy`, and `update` scripts accept an optional command line argument to indicate the current execution environment (e.g., dev, staging, prod, etc.). This will be the name of your Image Flex-based application in CloudFormation. Keep in mind that the names of all resources will be prepended with this name (including the S3 bucket to store the image files, further noting). 

Examples:
* `$ npm run update -- dev`
* `$ npm run update -- staging`
* `$ npm run update -- prod`
* `$ npm run update -- bills-test`

### 1. Setup
```bash
$ npm run setup [env]
```
Creates the CloudFormation deployment S3 bucket. SAM/CloudFormation will upload packaged build artifacts to this bucket to later be deployed. 

### 2. Update
```bash
$ npm run update [env]
```
A convenience script that runs `npm run build`, `npm run package`, and `npm run deploy` in order.

----
These are generally only called directly when debugging.
### 3. Build
```bash
$ npm run build
```
Installs and builds the dependencies for the ***GetOrCreateImage*** Lambda function using a Docker container built on the lambci/lambda:build-nodejs12.x Docker container image.

### 4. Package
```bash
$ npm run package [env]
```
Packages (zips) the functions and built dependencies, and uploads the artifacts to the deployment bucket.

### 5. Deploy
```bash
$ npm run deploy [env]
```
Deploys the application as defined by the SAM template, creating or updating the resources.

## Linting
Linting is instrumented via ESLint using Standard (JavaScript Standard Style). To execute linting, run the following:

```
npm run lint
```

## Testing
Unit tests are instrumented via Jest. 

```
npm run test
```

## Make it production-ready
While these steps are in no way required, here are some recommendations for a rock-solid, production ready implementation.

### 1. Use a CNAME
In [the SAM template](/template.yaml), under the `Distribution` resource, you can uncomment the following lines to use a CNAME instead of the `*.cloudfront.net` distribution domain.
```yaml
# Uncomment the next two lines to use a custom CNAME (must be configured in Route 53 or another DNS provider).
Aliases:
  - YOUR CNAME HERE
```
Be sure to replace `YOUR CNAME HERE` with your actual CNAME, and ensure that CNAME is created in Route 53 (or another DNS provider).

### 2. Add an your own SSL certificate for HTTPS
By default, this application will use the default CloudFront certificate for SSL/TLS. However, if you configure an Alias per the instructions above, it is required that you use your own certificate for SSL/TLS. In the [SAM template](/template.yaml), under the `Distribution` resource, make the following changes to configure the distribution to use your own certificate stored in [Certificate Manager](https://aws.amazon.com/certificate-manager/).

Change...
```yaml
ViewerCertificate:
  CloudFrontDefaultCertificate: true
```
To...
```yaml
ViewerCertificate:
  CloudFrontDefaultCertificate: false
  AcmCertificateArn: YOUR CERTIFICATE MANAGER ARN HERE
  SslSupportMethod: "sni-only"
```
Be sure to replace `YOUR CERTIFICATE MANAGER ARN HERE` with the ARN of your certificate.
