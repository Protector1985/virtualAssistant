import express, {Application} from 'express'





class App {
    
    public port:Number;
    public app: Application;

    public speechClient: any

    constructor(application: {port: Number, wsPort:number, middlewares:any[], services:any[], controllers:any[]}) {
        this.port = application.port,
        this.app = express();
        this.initMiddlewares(application.middlewares)
        this.routes(application.controllers)
        this.helloWorld()
    
    }

    //starts server
    startServer() {
        this.app.listen(this.port, () => {
            console.log(`Server running on ${this.port}`)
        })
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