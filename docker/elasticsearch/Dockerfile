# Elasticsearch with a Polish hunspell dictionary.
# Run `pnpm es:dict` first: it copies dictionary-pl (npm) into ./hunspell/pl_PL.
# Hunspell ships with Elasticsearch, so no plugin download is needed and the same
# files can be uploaded to Elastic Cloud as a custom bundle.
ARG REGISTRY=docker.io/library
ARG ES_VERSION=9.5.3
FROM ${REGISTRY}/elasticsearch:${ES_VERSION}
COPY --chown=elasticsearch:root hunspell/ /usr/share/elasticsearch/config/hunspell/
