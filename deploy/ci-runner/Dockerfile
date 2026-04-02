FROM node:20-alpine

RUN apk add --no-cache git gnupg curl python3 py3-pip && \
    pip3 install --break-system-packages awscli 2>/dev/null || \
    apk add --no-cache aws-cli || true

WORKDIR /runner

COPY runner.sh /runner/runner.sh
RUN chmod +x /runner/runner.sh

# Import trusted GPG keys
COPY trusted-keys/ /trusted-keys/
RUN for key in /trusted-keys/*.asc; do \
      [ -f "$key" ] && gpg --import "$key" 2>/dev/null || true; \
    done

ENTRYPOINT ["/runner/runner.sh"]
