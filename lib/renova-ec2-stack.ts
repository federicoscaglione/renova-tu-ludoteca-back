import * as cdk from "aws-cdk-lib/core";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

const APP_DIR = "/var/app/renova-tu-ludoteca-back";

export class RenovaEC2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const keyName = this.node.tryGetContext("ec2KeyName") as string | undefined;
    if (!keyName) {
      throw new Error(
        "Missing context: ec2KeyName. Add it to cdk.json (e.g. \"ec2KeyName\": \"renova-ec2-deploy\") and create the key pair in EC2 console first."
      );
    }

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
    });

    const sg = new ec2.SecurityGroup(this, "InstanceSg", {
      vpc,
      description: "SSH, HTTP, HTTPS for Renova EC2",
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), "SSH");
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP");
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");

    const role = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "set -e",
      "dnf update -y",
      "",
      "# Node 20 (Amazon Linux 2023 native package; nvm fails in non-interactive User Data)",
      "dnf install -y nodejs20",
      "alternatives --set node /usr/bin/node-20 2>/dev/null || true",
      "alternatives --set npm /usr/bin/npm-20 2>/dev/null || true",
      "command -v node >/dev/null || (ln -sf /usr/bin/node-20 /usr/local/bin/node && ln -sf /usr/bin/npm-20 /usr/local/bin/npm)",
      "",
      "# PostgreSQL 15 (listen only on 127.0.0.1, not exposed to internet)",
      "dnf install -y postgresql15 postgresql15-server",
      "/usr/bin/postgresql-setup --initdb 2>/dev/null || true",
      "sed -i -E \"s/^#?listen_addresses = .*/listen_addresses = 'localhost'/\" /var/lib/pgsql/15/data/postgresql.conf 2>/dev/null || true",
      "systemctl enable postgresql",
      "systemctl start postgresql || true",
      "",
      "# Nginx (proxy to Node on 3000)",
      "dnf install -y nginx",
      "cat > /etc/nginx/conf.d/nodeapp.conf << 'NGINX_EOF'",
      "server {",
      "  listen 80;",
      "  server_name _;",
      "  location / {",
      "    proxy_pass http://127.0.0.1:3000;",
      "    proxy_http_version 1.1;",
      "    proxy_set_header Host $host;",
      "    proxy_set_header X-Real-IP $remote_addr;",
      "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
      "    proxy_set_header X-Forwarded-Proto $scheme;",
      "  }",
      "}",
      "NGINX_EOF",
      "systemctl enable nginx",
      "systemctl start nginx",
      "",
      "# PM2 (global; node/npm now in PATH)",
      "npm install -g pm2",
      "",
      "# App directory",
      `mkdir -p ${APP_DIR}`,
      "chown -R ec2-user:ec2-user /var/app"
    );

    const instance = new ec2.Instance(this, "Instance", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      keyName,
      securityGroup: sg,
      role,
      userData,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });

    new cdk.CfnOutput(this, "InstanceId", {
      value: instance.instanceId,
      description: "EC2 Instance ID",
      exportName: "RenovaEC2InstanceId",
    });
    new cdk.CfnOutput(this, "PublicIp", {
      value: instance.instancePublicIp ?? "N/A (assign after first run)",
      description: "EC2 public IP for SSH and deploy script",
      exportName: "RenovaEC2PublicIp",
    });
    new cdk.CfnOutput(this, "PublicDnsName", {
      value: instance.instancePublicDnsName ?? "N/A",
      description: "EC2 public DNS name",
      exportName: "RenovaEC2PublicDnsName",
    });
    new cdk.CfnOutput(this, "AppDir", {
      value: APP_DIR,
      description: "Path on EC2 where the app repo should be cloned",
      exportName: "RenovaEC2AppDir",
    });
  }
}
