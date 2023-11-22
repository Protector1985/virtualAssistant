require('dotenv').config();
import express, {Request, Response, Router} from 'express';
import MongoService from "../services/MongoService";


class MongoController extends MongoService {
    private basePath="/mongo"
    public router: Router = express.Router();

    constructor() {
        super();
        this.initRoutes();
    }

    private initRoutes() {
        this.router.post(this.basePath + '/add', this.add.bind(this));
    }

    private async add(req:Request, res:Response) {
        try {
            const sv = await this.addClient(req.body)
            
            res.json({
                success: true,
                msg: "Client Saved successfully"
            })
        } catch(err) {
            res.json({
                success: false,
                msg: "Something went wrong"
            })
        }   
    }
}

export default MongoController;