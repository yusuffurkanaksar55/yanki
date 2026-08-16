locals {
  name = "yanki-staging"
}

data "aws_subnet" "selected" {
  id = var.subnet_id
}

resource "aws_iam_role" "staging_host" {
  name = "${local.name}-host"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${local.name}-host"
  }
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.staging_host.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "staging_host" {
  name = "${local.name}-host"
  role = aws_iam_role.staging_host.name
}

resource "aws_security_group" "staging_host" {
  name        = "${local.name}-host"
  description = "Public TLS only; administration uses AWS Systems Manager"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${local.name}-host"
  }

  lifecycle {
    precondition {
      condition     = data.aws_subnet.selected.vpc_id == var.vpc_id
      error_message = "The selected subnet must belong to vpc_id."
    }

    precondition {
      condition     = data.aws_subnet.selected.availability_zone == var.availability_zone
      error_message = "The selected subnet must belong to availability_zone."
    }
  }
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  for_each = var.web_ipv4_cidrs

  security_group_id = aws_security_group.staging_host.id
  cidr_ipv4         = each.value
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
  description       = "Public Yanki HTTPS"
}

resource "aws_vpc_security_group_ingress_rule" "http_acme" {
  for_each = var.enable_http_acme ? var.web_ipv4_cidrs : []

  security_group_id = aws_security_group.staging_host.id
  cidr_ipv4         = each.value
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
  description       = "ACME challenge and HTTPS redirect"
}

resource "aws_vpc_security_group_egress_rule" "ipv4" {
  security_group_id = aws_security_group.staging_host.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Package, registry, SSM, and provider egress"
}

resource "aws_instance" "staging_host" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  availability_zone           = var.availability_zone
  subnet_id                   = var.subnet_id
  associate_public_ip_address = true
  disable_api_termination     = var.protect_from_termination
  ebs_optimized               = true
  iam_instance_profile        = aws_iam_instance_profile.staging_host.name
  monitoring                  = true
  source_dest_check           = true
  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    minimum_free_disk_gib = var.minimum_free_disk_gib
    minimum_memory_gib    = var.minimum_memory_gib
  })
  user_data_replace_on_change = true
  vpc_security_group_ids      = [aws_security_group.staging_host.id]

  metadata_options {
    http_endpoint               = "enabled"
    http_protocol_ipv6          = "disabled"
    http_put_response_hop_limit = 2
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    delete_on_termination = true
    encrypted             = true
    iops                  = 3000
    kms_key_id            = var.ebs_kms_key_arn
    throughput            = 125
    volume_size           = var.root_volume_size_gib
    volume_type           = "gp3"
  }

  tags = {
    Name   = local.name
    Domain = var.domain_name
  }

  volume_tags = {
    Name = "${local.name}-root"
  }

  depends_on = [aws_iam_role_policy_attachment.ssm_core]

  lifecycle {
    precondition {
      condition     = data.aws_subnet.selected.map_public_ip_on_launch || var.network_border_group != null
      error_message = "Use a reviewed public subnet or provide the Local Zone network_border_group."
    }
  }
}

resource "aws_eip" "staging_host" {
  domain               = "vpc"
  network_border_group = var.network_border_group

  tags = {
    Name = "${local.name}-public"
  }
}

resource "aws_eip_association" "staging_host" {
  allocation_id = aws_eip.staging_host.id
  instance_id   = aws_instance.staging_host.id
}
