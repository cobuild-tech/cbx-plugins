# Networking

GCP networks are global. AWS networks are regional with per-AZ subnets.
Plan the network before any workload: subnet size, especially for EKS, is
hard to change later.

## Map

| GCP | AWS |
|---|---|
| Global VPC with regional subnets | One VPC per region; subnets per AZ; Transit Gateway or peering between regions |
| Shared VPC (host/service projects) | VPC sharing via AWS RAM, or Transit Gateway |
| Firewall rule targeting network tags or service accounts | Security group attached to the instance/ENI (can reference other SGs) |
| Hierarchical firewall policies | Network Firewall / Firewall Manager policies |
| Cloud NAT | NAT gateway per AZ (billed per hour and per GB) |
| Private Google Access | VPC endpoints (gateway for S3/DynamoDB, interface for the rest) |
| Private Service Connect | PrivateLink (interface endpoints, endpoint services) |
| Global external HTTP(S) LB | ALB per region + Route 53 latency/weighted routing, or CloudFront |
| Regional internal HTTP(S) LB | Internal ALB |
| TCP/UDP / passthrough LB | NLB |
| Cloud Armor | AWS WAF (+ Shield) |
| Cloud CDN | CloudFront |
| Cloud DNS (public, private zones) | Route 53 (public, private hosted zones) |
| Cloud VPN / Interconnect | Site-to-Site VPN / Direct Connect |
| Serverless VPC connector, Direct VPC egress | Lambda VPC config; ECS tasks run in the VPC already |
| VPC flow logs | VPC flow logs |

## Rules

- **Rewrite every firewall rule.** GCP rules are VPC-wide and select
  targets by tag or service account; priorities and deny rules exist.
  Security groups are allow-only, stateful, and attached per resource.
  Deny rules become network ACLs or Network Firewall. Use SG-to-SG
  references instead of CIDRs where GCP used tags.
- **At least two AZs** for anything that was regional on GCP (MIGs,
  regional GKE, Cloud SQL HA).
- **Size subnets for EKS.** With the VPC CNI each pod takes a VPC IP.
  Use large private subnets per AZ or prefix delegation (`compute.md`).
- **Endpoints first.** Add the S3 gateway endpoint (free) to every VPC,
  and interface endpoints for heavy-use services (ECR, Secrets Manager,
  STS, CloudWatch Logs) to cut NAT gateway charges.
- **Cross-AZ traffic is billed** per GB in each direction. Keep chatty
  services in the same AZ where availability allows.
- **No overlapping CIDRs** between the GCP VPC and the AWS VPCs, or the
  migration link can't route.

## The link between clouds

During the move, workloads on each side call the other. Set up a private
link before the first wave: HA VPN (GCP) ↔ Site-to-Site VPN (AWS) for
modest traffic, or Cloud Interconnect ↔ Direct Connect through a partner
for large data. Bulk data copies (DataSync) can also go over the public
internet with TLS. Remove calls back to GCP as each wave lands: they add
latency and egress charges.

## DNS and cutover

- Move to DNS names everywhere; hard-coded IPs break at cutover.
- Lower TTLs a few days before cutover (e.g. to 60 s).
- If Cloud DNS hosts the zone, either move the zone to Route 53 first or
  delegate a subdomain. Then shift traffic with Route 53 weighted records
  (`methodology/cutover.md`).
- Certificates: Google-managed certificates don't move. Issue ACM
  certificates (DNS validation) before cutover.
