require('dotenv').config();
import App from "./app";
import express from 'express'
import MongoService from "./services/MongoService";
import Promptservice from "./services/prompts/PromptService";
import PhoneService from "./services/phoneCalls/PhoneService";
import CallController from "./controllers/callController";

const port:Number = Number(process.env.PORT)
const wsPort: number= Number(process.env.WEB_SOCKET_PORT)


try {
    const app = new App({
        port,
        wsPort,
        middlewares:[express.json()],
        services: [new MongoService(), new PhoneService(), new Promptservice()],
        controllers:[new CallController()]
    })

    //starts the server
    app.startServer();
} catch(err) {
    console.log(err)
}