variable "aws_region" {
  description = "AWS parent region used by the selected subnet and AMI."
  type        = string

  validation {
    condition     = can(regex("^[a-z]{2}(?:-gov)?-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "aws_region must be a valid AWS region code."
  }
}

variable "availability_zone" {
  description = "Expected availability zone or Local Zone of the supplied subnet."
  type        = string

  validation {
    condition     = startswith(var.availability_zone, var.aws_region)
    error_message = "availability_zone must belong to aws_region."
  }
}

variable "vpc_id" {
  description = "Existing reviewed VPC identifier."
  type        = string

  validation {
    condition     = can(regex("^vpc-[0-9a-f]+$", var.vpc_id))
    error_message = "vpc_id must be an AWS VPC identifier."
  }
}

variable "subnet_id" {
  description = "Existing public subnet with an internet gateway route."
  type        = string

  validation {
    condition     = can(regex("^subnet-[0-9a-f]+$", var.subnet_id))
    error_message = "subnet_id must be an AWS subnet identifier."
  }
}

variable "ami_id" {
  description = "Reviewed Ubuntu LTS AMI pinned for the selected region or Local Zone."
  type        = string

  validation {
    condition     = can(regex("^ami-[0-9a-f]+$", var.ami_id))
    error_message = "ami_id must be an AWS AMI identifier."
  }
}

variable "instance_type" {
  description = "EC2 type verified as available in the selected zone with at least 8 GiB memory."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]+[a-z0-9.-]*$", var.instance_type))
    error_message = "instance_type must be a valid EC2 instance type."
  }
}

variable "ebs_kms_key_arn" {
  description = "Customer-managed KMS key ARN for the encrypted staging root volume."
  type        = string

  validation {
    condition     = can(regex("^arn:[^:]+:kms:[^:]+:[0-9]{12}:key/[0-9a-f-]+$", var.ebs_kms_key_arn))
    error_message = "ebs_kms_key_arn must identify a KMS key, not an alias."
  }
}

variable "domain_name" {
  description = "Staging FQDN that will point to the allocated Elastic IP."
  type        = string

  validation {
    condition = (
      length(var.domain_name) <= 253
      && can(regex("^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$", var.domain_name))
      && strcontains(var.domain_name, ".")
    )
    error_message = "domain_name must be a lower-case fully qualified domain name."
  }
}

variable "network_border_group" {
  description = "Optional network border group required when allocating an Elastic IP in a Local Zone."
  type        = string
  default     = null
  nullable    = true
}

variable "root_volume_size_gib" {
  description = "Encrypted gp3 root volume size. Supabase images and acceptance data require durable headroom."
  type        = number
  default     = 100

  validation {
    condition     = var.root_volume_size_gib >= 80
    error_message = "root_volume_size_gib must be at least 80 GiB."
  }
}

variable "minimum_free_disk_gib" {
  description = "Host preflight free-space requirement before staging installation."
  type        = number
  default     = 30

  validation {
    condition     = var.minimum_free_disk_gib >= 20
    error_message = "minimum_free_disk_gib must be at least 20 GiB."
  }
}

variable "minimum_memory_gib" {
  description = "Host preflight memory requirement for the single-host staging stack."
  type        = number
  default     = 8

  validation {
    condition     = var.minimum_memory_gib >= 8
    error_message = "minimum_memory_gib must be at least 8 GiB."
  }
}

variable "protect_from_termination" {
  description = "Enable EC2 API termination protection. Keep true outside disposable rehearsals."
  type        = bool
  default     = true
}

variable "enable_http_acme" {
  description = "Allow public TCP/80 only for ACME HTTP challenge and HTTPS redirect."
  type        = bool
  default     = true
}

variable "web_ipv4_cidrs" {
  description = "IPv4 clients allowed to reach the public HTTP/HTTPS staging endpoint."
  type        = set(string)
  default     = ["0.0.0.0/0"]

  validation {
    condition = (
      length(var.web_ipv4_cidrs) > 0
      && alltrue([for cidr in var.web_ipv4_cidrs : can(cidrnetmask(cidr))])
    )
    error_message = "web_ipv4_cidrs must contain valid IPv4 CIDR values."
  }
}

variable "additional_tags" {
  description = "Non-sensitive billing, owner, and workload tags."
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for key, value in var.additional_tags :
      !contains(["Application", "Environment", "ManagedBy", "Name"], key)
      && length(value) > 0
    ])
    error_message = "additional_tags cannot replace reserved tags or contain empty values."
  }
}
