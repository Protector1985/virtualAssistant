import express, {Application} from 'express'
import { Server as HttpServer } from 'http';
import { Server as WebSocketServer } from 'ws';




class App {
    
    public port:number;
    public app: Application;
    public server!: HttpServer;
    public wsServer!: WebSocketServer;
    public speechClient: any

    constructor(application: {port: number, wsPort:number, middlewares:any[], services:any[], controllers:any[]}) {
        this.port = application.port,
        this.app = express();
        this.initMiddlewares(application.middlewares)
        this.routes(application.controllers)
        this.helloWorld()
    
    }

    initWebSocket() {
       
        let fileStream:any;
        let isCallActive = false
        
        // this.wsServer.on('connection', (ws) => {
        //     console.log('WebSocket connection established');
            
            // ws.on('message', (message) => {
            //     const messageString = message.toString();
            //     try {
            //         const messageJSON = JSON.parse(messageString);
        
            //         if (messageJSON.event === "start") {
            //             console.log("Call Started:", messageJSON);
                       
            //         } else if (messageJSON.event === "media") {
            //             const rawAudio = Buffer.from(messageJSON.media.payload, 'base64');
                        
            //         } else if (messageJSON.event === "stop") {
            //             console.log("Call Stopped:", messageJSON);
                        
            //         }
            //     } catch (e) {
            //         console.error('Error parsing JSON:', e);
            //     }
            // });

            // ws.on('close', () => {
            //     console.log('WebSocket connection closed');
            // });

            // You can also handle other events like 'error'
        // });
    }

    //starts server
    startServer() {
        this.server = this.app.listen(this.port, () => {
            console.log(`Server running on ${this.port}`);
        });

        // Initialize WebSocket server on the same port
        this.wsServer = new WebSocketServer({ server: this.server });
        this.initWebSocket();
    }

    routes(controllers:{forEach:(arg0:(controller:any)=>void)=>void}) {
        controllers.forEach((controller) => {
            this.app.use('/v1', controller.router)
        })
    }



    //initializes middleware
    initMiddlewares(middlewares:{forEach:(arg0:(middleware:any)=>void) =>void}) {
        middlewares.forEach((middleware) => {
            this.app.use(middleware)
        })
    }

    helloWorld() {
        this.app.get('/', (req, res) => {
            console.log("api request received")
            res.send("API-ONLINE")
        });
    }

    //initializes routes
    
}

export default App;