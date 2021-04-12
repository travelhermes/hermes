FROM rust
LABEL maintainer="Álvaro Galisteo (https://galisteo.me)"

# Install python
RUN apt-get update
RUN apt-get install -y python3 python-pip

# Install node & rust prereqs, nodejs and yarn
RUN echo "deb https://deb.nodesource.com/node_14.x buster main" > /etc/apt/sources.list.d/nodesource.list
RUN wget -qO- https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo "deb http://ftp.us.debian.org/debian testing main contrib non-free" >> /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y nodejs build-essential
RUN pip install -U pip && pip install pipenv
RUN npm i -g npm neon-cli
RUN rm -rf /var/lib/apt/lists/*

# Copy files and install app
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install

COPY . /usr/src/app

# Install hermes-rust package
WORKDIR /usr/src/app/hermes-rust
#RUN npm i
#RUN neon build --release

WORKDIR /usr/src/app

EXPOSE 80
CMD [ "node", "--trace-warnings", "index.js" ]
