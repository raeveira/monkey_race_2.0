"use client";

import { io } from "socket.io-client";

const URL = process.env.NODE_ENV === "production" ? "domain" : "http://localhost:3000"

export const socket = io(URL)