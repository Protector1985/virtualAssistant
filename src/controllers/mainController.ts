require('dotenv').config();
import express, {Router} from 'express';


import Promptservice from '../services/prompts/PromptService';

class MainController extends Promptservice {
    public basePath = '/'
    public router: Router = express.Router();
    
    constructor() {
        super();
        this.initRoutes();
    }

    public initRoutes(): void {
        //receives webhook to start response logic.
        this.router.post(this.basePath + '/initCall', this.initCall.bind(this));
    
    }

    initCall() {

    }

   

 

    
}

export default MainController;