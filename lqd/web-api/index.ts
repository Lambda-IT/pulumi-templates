import {
    Helper,
    LambdaK8sConfiguration,
    LambdaK8SDeployment,
} from "@lambda-it/pulumi-lib";
import * as types from "@lambda-it/pulumi-lib/types";
import * as pulumi from "@pulumi/pulumi";

import { Environments } from "./types";

const cfg = new pulumi.Config();

const clusterContext = new pulumi.Config("kubernetes").require("context");
const environment = cfg.require("environment");
const project = cfg.require("project");
const component = cfg.require("component");
const containerImage = cfg.require("container-image");
const version = cfg.require("version");
const namespace = cfg.require("namespace");
const certCommonName = cfg.require("certificate-common-name");
const url = cfg.require("url");
const path = cfg.require("path");
const compress = cfg.requireBoolean("compress");
const registrySecret = cfg.requireSecret("registry-secret");
const environments = cfg.get("environments");
const basicAuth = cfg.get<types.OnePasswordUrl>("onepassword-basic-auth");

const app = "${PROJECT}";

pulumi.log.info(`Project:             ${project}`);
pulumi.log.info(`Container Image:     ${containerImage}`);
pulumi.log.info(`Using cluster:       ${clusterContext}`);
pulumi.log.info(`Using namespace:     ${namespace}`);
pulumi.log.info(`Tag to deploy:       ${version}`);
pulumi.log.info(`ENV to deploy        ${environment}`);
pulumi.log.info(`Requested Url:       ${url}`);

const genericConfig: types.InitPulumiConfig = {
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
        name: types.RegistryName.HarborCR,
        value: registrySecret,
    },
};

// Deployment APP
const apiConfiguration = new LambdaK8sConfiguration(genericConfig)
    .setCertificateCommonName(certCommonName)
    .addEnvironment({
        name: "PORT",
        value: "80",
    })
    .setResources({
        limits: {
            cpu: "500m",
            memory: "512Mi",
        },
    });

if (environments) {
    const parsedEnironments = JSON.parse(
        Buffer.from(environments, "base64").toString("utf-8")
    ) as Environments;
    parsedEnironments.onePassword?.forEach((onePassword, i) => {
        apiConfiguration.createOnePasswordSecret(
            `${project}-onepass-secret-${app}-${i}`,
            onePassword.itemUrl as types.OnePasswordUrl,
            {
                envs: onePassword.mapping.map(({ env, field }) => ({
                    name: field,
                    alias: env,
                })),
            }
        );
    });
    parsedEnironments.envs.forEach((env) => {
        apiConfiguration.addEnvironment(env);
    });
}

let onepassBasicAuthSecret: string | undefined;

if (basicAuth) {
    onepassBasicAuthSecret = Helper.createNameFromMetadata(
        apiConfiguration.values().metadata,
        "onepass-basic-auth"
    );

    apiConfiguration.createOnePasswordSecret(onepassBasicAuthSecret, basicAuth, {
        type: types.SecretType.KubernetesBasicAuth,
    });
}

new LambdaK8SDeployment(apiConfiguration)
    .addTraefikRoute({
        match: "Host(`" + url + "`) && PathPrefix(`" + path + "`)",
        services: [{ port: 80 }],
        middlewares: [
            ...(compress
                ? [
                      {
                          name: `${component}-api-compress`,
                          spec: {
                              compress: {},
                          },
                      },
                  ]
                : []),
            ...(basicAuth
                ? [
                      {
                          name: `${component}-basic-auth`,
                          spec: {
                              basicAuth: {
                                  secret: onepassBasicAuthSecret,
                              },
                          },
                      },
                  ]
                : []),
        ],
    })
    .setCertificate("letsencrypt")
    .createDeployment();
