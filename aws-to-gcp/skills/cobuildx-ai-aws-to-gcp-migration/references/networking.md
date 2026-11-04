# Networking

AWS networks are regional with per-AZ subnets. GCP VPCs are global with
regional subnets. Plan the network before any workload: subnet and
secondary range sizing, especially for GKE, is hard to change later.

## Map

| AWS | GCP |
|---|---|
| One VPC per region; subnets per AZ | One global VPC; one subnet per region (spans all zones) |
| Transit Gateway / VPC peering | Network Connectivity Center, VPC Network Peering, or Shared VPC |
| VPC sharing (AWS RAM) | Shared VPC (host/service projects) |
| Security group attached to ENI | VPC firewall rules or network firewall policies targeting network tags, secure tags, or service accounts |
| Network ACL (stateless, deny) | Firewall rules with priority and `deny` |
| Network Firewall / Firewall Manager | Cloud NGFW, hierarchical firewall policies |
| NAT gateway per AZ | Cloud NAT per region (on a Cloud Router) |
| Gateway / interface VPC endpoints | Private Google Access; Private Service Connect for Google APIs |
| PrivateLink endpoint services | Private Service Connect (published services) |
| ALB (regional) + Route 53 / CloudFront | Global external Application Load Balancer (or regional) |
| Internal ALB | Internal Application Load Balancer |
| NLB | External/internal passthrough or proxy Network Load Balancer |
| AWS WAF / Shield | Cloud Armor |
| CloudFront | Cloud CDN (or Media CDN) |
| Route 53 (public, private hosted zones) | Cloud DNS (public, private zones) |
| Route 53 health checks / weighted / latency routing | Cloud DNS routing policies (weighted, geolocation, failover) or LB traffic splitting |
| Site-to-Site VPN / Direct Connect | HA VPN / Cloud Interconnect (Dedicated, Partner, Cross-Cloud) |
| Lambda VPC config | Cloud Run Direct VPC egress or Serverless VPC Access connector |
| VPC flow logs | VPC flow logs |
| ACM certificates | Certificate Manager / Google-managed SSL certificates |

## Rules

- **Rewrite every security group.** SGs are allow-only, stateful, and
  attached per ENI, and can reference other SGs. GCP firewall rules are
  VPC-wide and select targets by network tag, secure tag, or service
  account. Turn each SG into rules targeting a tag or SA; turn SG-to-SG
  references into source tags/service accounts. NACL denies become
  `deny` rules with priority. Keep the implied deny-all ingress.
- **Zones come for free.** A regional subnet covers every zone, so
  "two AZ subnets" collapses to one subnet; spread work with regional
  MIGs, regional GKE, and HA databases instead.
- **Size secondary ranges for GKE** (pods and services) up front
  (`compute.md`).
- **Turn on Private Google Access** on every subnet whose VMs have no
  external IP, so GCS and Google APIs don't go through Cloud NAT.
- **Global VPC changes blast radius.** One VPC spanning regions means a
  firewall rule applies everywhere unless scoped. Scope by tag or SA, and
  use separate VPCs or projects where AWS used separate accounts.
- **No overlapping CIDRs** between the AWS VPCs and the GCP VPC, or the
  migration link can't route.

## The link between clouds

During the move, workloads on each side call the other. Set up a private
link before the first wave: HA VPN (GCP) ↔ Site-to-Site VPN (AWS) with
BGP for modest traffic, or Cross-Cloud Interconnect / Partner
Interconnect ↔ Direct Connect for large data. Bulk copies (Storage
Transfer Service) can also go over the public internet with TLS. Remove
calls back to AWS as each wave lands: they add latency and egress
charges.

## DNS and cutover

- Move to DNS names everywhere; hard-coded IPs and AWS hostnames
  (`*.elb.amazonaws.com`, `*.rds.amazonaws.com`) break at cutover.
- Lower TTLs a few days before cutover (e.g. to 60 s).
- If Route 53 hosts the zone, either move the zone to Cloud DNS first or
  keep it on Route 53 during cutover and use its weighted records
  (simplest), then move the zone after. Route 53 alias records have no
  Cloud DNS equivalent; use A/AAAA/CNAME (`methodology/cutover.md`).
- Certificates: ACM certificates' private keys can't be exported (except
  exportable public certs). Issue Google-managed certificates (DNS
  authorization) before cutover.
