import { LambdaK8sConfiguration, LambdaK8SDeployment } from '@lambda-it/pulumi-lib';
import { InitPulumiConfig, RegistryName } from '@lambda-it/pulumi-lib/types';
import * as pulumi from '@pulumi/pulumi';

const cfg = new pulumi.Config();

// load tenant/env based configuration
const clusterContext = new pulumi.Config('kubernetes').require('context');
const environment = cfg.require('environment');
const identifier = cfg.require('identifier');
const version = cfg.require('version');
const url = `${environment}-${identifier}.lqd.lambda-it.ch`;

// general variables for deployment
const namespace = `lambda-quick-deployment`;

const app = 'web-app';
const appName = `${app}-${environment}`;

// logging info
pulumi.log.info(`ID:                  ${identifier}`);
pulumi.log.info(`Using cluster:       ${clusterContext}`);
pulumi.log.info(`Using namespace:     ${namespace}`);
pulumi.log.info(`Tag to deploy:       ${version}`);
pulumi.log.info(`ENV to deploy        ${environment}`);
pulumi.log.info(`Requested Url:       ${url}`);

const registrySecret = cfg.requireSecret('registry-secret');

const genericConfig: InitPulumiConfig = {
    appUrls: [url],
    dockerImage: `registry.lambda-it.ch/lqd-containers/${identifier}:${version}`,
    labels: {
        project: identifier,
        app: appName,
        env: environment,
    },
    namespace,
    port: { containerPort: 80 },
    registrySecret: {
        name: RegistryName.HarborCR,
        value: registrySecret,
    },
};

// Deployment APP
const appConfiguration = new LambdaK8sConfiguration(genericConfig);
new LambdaK8SDeployment(appConfiguration)
    .addTraefikRoute('simple')
    .setCertificate('letsencrypt')
    .createNamespace()
    .createRepository()
    .createDeployment();
