import oci
import time

config = oci.config.from_file()
network_client = oci.core.VirtualNetworkClient(config)
subnet_id = "ocid1.subnet.oc1.iad.aaaaaaaaflq35tpxdu3z6p4ixds4pqgixivnahrjbrlazn73ukp5hhujry2q"

def call_with_retry(func, *args, **kwargs):
    max_attempts = 6
    for attempt in range(max_attempts):
        try:
            return func(*args, **kwargs)
        except oci.exceptions.ServiceError as e:
            if e.status == 401 and attempt < max_attempts - 1:
                time.sleep(2)
            else:
                raise e

# Get subnet
subnet = call_with_retry(network_client.get_subnet, subnet_id).data
print(f"Subnet: {subnet.display_name}")
print(f"Security List IDs: {subnet.security_list_ids}")

# Read each security list
for sec_list_id in subnet.security_list_ids:
    sec_list = call_with_retry(network_client.get_security_list, sec_list_id).data
    print(f"\nSecurity List: {sec_list.display_name} ({sec_list_id})")
    print("Ingress Rules:")
    for rule in sec_list.ingress_security_rules:
        port_range = "All"
        if rule.protocol == "6" and rule.tcp_options:
            port_range = f"{rule.tcp_options.destination_port_range.min}-{rule.tcp_options.destination_port_range.max}"
        elif rule.protocol == "17" and rule.udp_options:
            port_range = f"{rule.udp_options.destination_port_range.min}-{rule.udp_options.destination_port_range.max}"
        print(f"  Source: {rule.source}, Protocol: {rule.protocol}, Port: {port_range}")
