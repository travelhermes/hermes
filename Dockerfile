FROM rust AS build
LABEL maintainer="Álvaro Galisteo (https://galisteo.me)"

# Install python
RUN apt-get update && \
    apt-get install -y python3 python-pip

# Install node & rust prereqs, nodejs and yarn
RUN echo "deb https://deb.nodesource.com/node_14.x buster main" > /etc/apt/sources.list.d/nodesource.list && \
    wget -qO- https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - && \
    echo "deb http://ftp.us.debian.org/debian testing main contrib non-free" >> /etc/apt/sources.list
RUN apt-get update && \
    apt-get install -y nodejs build-essential minify && \
    pip install -U pip && pip install pipenv && \
    npm i -g npm neon-cli html-minifier uglify-js csso-cli && \
    rm -rf /var/lib/apt/lists/*

FROM build

# Copy files and install app
WORKDIR /usr/src/app
COPY ./server/package*.json ./
RUN npm i --omit=dev

COPY ./server /usr/src/app
COPY ./web /usr/src/app/web

# Install hermes-rust package
WORKDIR /usr/src/app/hermes-rust
RUN npm i --omit=dev && \
    rm -rf native/target node_modules

# Minify files and cleanup
RUN find /usr/src/app/web -name '*.html' -exec /usr/bin/html-minifier --collapse-whitespace --remove-comments --sort-attributes --sort-class-name -o {} {} \; && \
    find /usr/src/app/web -name '*.js' -exec /usr/bin/uglifyjs {} --output {} --compress --mangle \; && \
    find /usr/src/app/web -name '*.css' -exec /usr/bin/csso {} --input {} --output {} \; && \
    minify -o /usr/src/app/localization/lang/es.json /usr/src/app/localization/lang/es.json && \
    minify -o /usr/src/app/localization/lang/en.json /usr/src/app/localization/lang/en.json

# Create user to prevent root usage
RUN useradd -ms /bin/bash node && \
    mkdir -p /usr/src/app && \
    chown -R node:node /usr/src/app

USER node
WORKDIR /usr/src/app
EXPOSE 80
CMD [ "node", "--trace-warnings", "index.js" ]
