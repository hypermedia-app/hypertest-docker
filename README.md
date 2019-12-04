# hydrofoil-docker

Docker images for running tests against Hypermedia APIs

## `hydrofoil/hydra-analyser`

Wraps [hydra-validator-analyse](https://www.npmjs.com/package/hydra-validator-analyse) which runs static analysis
against [hydra-powered](http://www.hydra-cg.com) APIs.

### Usage

This docker can be simply used directly by passing the APIs entrypoint URL:

```bash
docker run -it --rm --network host hydrofoil/hydra-analyser http://localhost:12345/
```

The entrypoint URL can also be passed in as an environment variable, for example in a `docker-compose.yml` file

```yml
version: "3"

services:
  analyzer:
    image: "hydrofoil/hydra-analyser"
    network_mode: "host"
    environment:
      ENTRYPOINT_URL: "http://localhost:12345/"
```

Note the use of `--network host` and `network_mode: "host"` in both examples to have the container access an app running
locally. Naturally, that won't be needed if analysing a remote, publicly available service.

## `hydrofoil/hypertest`

Compiles and runs [hypertest][hypertest] test scenarios.

### Usage

First step is to actually create an-app specific docker image by packaging `hydrofoil/hypertest` with the source files
written in the [Hypertest DSL][hypertest].

```docker
FROM hydrofoil/hypertest

ADD e2e-tests/ tests/
```

Now, run build and run the container:

```bash
docker build . -t my-e2e-tests
docker run -it --network host my-e2e-tests --baseUri http://localhost:1234/
```

The `baseUri` parameter can also be provided as an environment variable.

```yml
version: "3"

services:
  e2e-tests:
    image: "hydrofoil/hypertest"
    network_mode: "host"
    environment:
      BASE_URI: "http://localhost:12345/"
```

Finally, tests can be filtered by a regular expression which is matched against the relative path to test files within
the `tests` directory.
For example, running from the above `docker-compose.yml`:

```bash
docker-compose run e2e-tests --grep ^ProductsCollectionEndpoint/PostRequest_
```

[hypertest]: https://testing.hypermedia.app/dsl/
