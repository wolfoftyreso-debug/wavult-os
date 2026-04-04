# ALB — Application Load Balancer
resource "aws_lb" "wavult_api" {
  name               = "wavult-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [data.aws_security_group.alb.id]
  subnets            = [var.public_subnet_a, var.public_subnet_b]

  enable_deletion_protection = true
  enable_http2               = true

  access_logs {
    bucket  = aws_s3_bucket.wavult_build_artifacts.id
    prefix  = "alb-logs"
    enabled = false
  }

  tags = {
    Name        = "wavult-api-alb"
    Environment = var.environment
    Project     = "wavult"
  }
}

# ─── TARGET GROUPS ────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "wavult_os_api" {
  name        = "wavult-os-api-tg"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "wavult-os-api-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "wavult_core" {
  name        = "w-core-tg"
  port        = 3007
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "w-core-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "identity" {
  name        = "w-identity-tg"
  port        = 3005
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "w-identity-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "quixzoom" {
  name        = "w-quixzoom-tg"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "w-quixzoom-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "n8n" {
  name        = "w-n8n-tg"
  port        = 5678
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200-302"
  }

  tags = {
    Name        = "w-n8n-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "gitea" {
  name        = "w-gitea-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200-302"
  }

  tags = {
    Name        = "w-gitea-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "company" {
  name        = "w-company-tg"
  port        = 3008
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "w-company-tg"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "supabase" {
  name        = "wavult-supabase-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200-404"
  }

  tags = {
    Name        = "wavult-supabase-tg"
    Environment = var.environment
  }
}

# ─── LISTENERS ────────────────────────────────────────────────────────────────

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.wavult_api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.wavult_api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.alb_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.wavult_os_api.arn
  }
}

resource "aws_lb_listener" "supabase" {
  load_balancer_arn = aws_lb.wavult_api.arn
  port              = 8000
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.supabase.arn
  }
}

# ─── LISTENER RULES (HTTPS :443) ──────────────────────────────────────────────

resource "aws_lb_listener_rule" "auth_oauth" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 2

  condition {
    path_pattern { values = ["/v1/auth/oauth/*"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.wavult_core.arn
  }
}

resource "aws_lb_listener_rule" "company" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 3

  condition {
    path_pattern { values = ["/v1/company/*"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.company.arn
  }
}

resource "aws_lb_listener_rule" "identity_paths" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 4

  condition {
    path_pattern {
      values = ["/identity/*", "/v1/auth/*", "/v1/migrate/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.identity.arn
  }
}

resource "aws_lb_listener_rule" "core_paths" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 5

  condition {
    path_pattern {
      values = ["/revolut/*", "/v1/missions*", "/v1/zoomers*", "/v1/objects*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.wavult_core.arn
  }
}

resource "aws_lb_listener_rule" "uapix" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 6

  condition {
    path_pattern { values = ["/v1/uapix/*"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.wavult_core.arn
  }
}

resource "aws_lb_listener_rule" "n8n_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 8

  condition {
    host_header { values = ["n8n.wavult.com"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n.arn
  }
}

resource "aws_lb_listener_rule" "n8n_path" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  condition {
    path_pattern { values = ["/n8n*"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n.arn
  }
}

resource "aws_lb_listener_rule" "quixzoom_api_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  condition {
    host_header { values = ["api.quixzoom.com"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.quixzoom.arn
  }
}

resource "aws_lb_listener_rule" "gitea_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 25

  condition {
    host_header { values = ["git.wavult.com"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gitea.arn
  }
}

resource "aws_lb_listener_rule" "wavult_api_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 30

  condition {
    host_header { values = ["api.wavult.com"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.wavult_os_api.arn
  }
}

resource "aws_lb_listener_rule" "hypbit_api_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 35

  condition {
    host_header { values = ["api.hypbit.com"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.wavult_os_api.arn
  }
}

resource "aws_lb_listener_rule" "supabase_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  condition {
    host_header { values = ["supabase.wavult.com"] }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.supabase.arn
  }
}
