# Copyright 2023 Wayback Archiver. All rights reserved.
# Use of this source code is governed by the MIT
# license that can be found in the LICENSE file.

FROM node:20-alpine as builder

#RUN wget -O- https://gobinaries.com/tj/node-prune | sh

WORKDIR /app

ADD . /app/

RUN yarn install && yarn build

# Remove development dependencies
RUN npm prune --production
RUN yarn autoclean

FROM node:20-alpine

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN chmod +x /app/dist/cli.js
RUN ln -s /app/dist/cli.js /usr/local/bin/cairn
