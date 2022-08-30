import { LambdaK8sConfiguration, LambdaK8SDeployment } from "@lambda-it/pulumi-lib";
import { InitPulumiConfig, RegistryName } from "@lambda-it/pulumi-lib/types";
import * as pulumi from "@pulumi/pulumi";

const cfg = new pulumi.Config();

// Load configuration
const clusterContext = new pulumi.Config("kubernetes").require("context");
const environment = cfg.require("environment");
const project = cfg.require("project");
const component = cfg.require("component");
const containerImage = cfg.require("container-image");
const version = cfg.require("version");
const namespace = cfg.require("namespace");
const certCommonName = cfg.require("certificate-common-name");
const url = cfg.require("url");
const basicAuth = cfg.get("onepassword-basic-auth");

const app = "${PROJECT}";

pulumi.log.info(`Project:             ${project}`);
pulumi.log.info(`Container Image:     ${containerImage}`);
pulumi.log.info(`Using cluster:       ${clusterContext}`);
pulumi.log.info(`Using namespace:     ${namespace}`);
pulumi.log.info(`Tag to deploy:       ${version}`);
pulumi.log.info(`ENV to deploy        ${environment}`);
pulumi.log.info(`Requested Url:       ${url}`);

const registrySecret = cfg.requireSecret("registry-secret");

const genericConfig: InitPulumiConfig = {
    appUrls: [url],
    dockerImage: `${containerImage}:${version}`,
    labels: {
        project,
        app,
        env: environment,
        ...(component ? { component } : {}),
    },
    namespace,
    port: { containerPort: 80 },
    registrySecret: {
        name: RegistryName.HarborCR,
        value: registrySecret,
    },
};

const appConfiguration = new LambdaK8sConfiguration(
    genericConfig
).setCertificateCommonName(certCommonName);

const deployment = new LambdaK8SDeployment(appConfiguration)
    .addTraefikRoute("simple", basicAuth)
    .setCertificate("letsencrypt")
    .createRepository();

// Create namespace if necessary
deployment.createDeployment();
