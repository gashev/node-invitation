#!/bin/bash

SERVERS='localhost:50000,localhost:50001,localhost:50002,localhost:50003,localhost:50004';

IP=localhost PORT=50000 SERVERS=$SERVERS nohup npm start &
IP=localhost PORT=50001 SERVERS=$SERVERS nohup npm start &
IP=localhost PORT=50002 SERVERS=$SERVERS nohup npm start &
IP=localhost PORT=50003 SERVERS=$SERVERS nohup npm start &
IP=localhost PORT=50004 SERVERS=$SERVERS nohup npm start &
