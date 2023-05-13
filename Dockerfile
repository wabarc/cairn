FROM node:18-alpine as builder

#RUN wget -O- https://gobinaries.com/tj/node-prune | sh

WORKDIR /app

ADD . /app/

RUN yarn install && yarn build

# Remove development dependencies
RUN npm prune --production
RUN yarn autoclean

FROM node:18-alpine

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN chmod +x /app/dist/cli.js
RUN ln -s /app/dist/cli.js /usr/local/bin/cairn
