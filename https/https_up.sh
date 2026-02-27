#!/bin/sh
/opt/youtubedl/cmd stop
/opt/fweb_server/https/acme.sh --renew -d b.fweb.cc --force
cp /root/.acme.sh/fweb.cc_ecc/b.fweb.cc.key /opt/youtubedl/https/server.key
cp /root/.acme.sh/fweb.cc_ecc/fullchain.cer /opt/youtubedl/https/fullchain.cer
/opt/youtubedl/cmd start