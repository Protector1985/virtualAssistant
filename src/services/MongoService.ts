import mongoose from 'mongoose'

class MongoService {

    constructor() {
        this.connectMongoDb()
    }

    async connectMongoDb(): Promise<void> {
        try {
            const dbURI = process.env.DB

            if(!dbURI) {
                throw new Error("DB URI has to be provided")
            }

            mongoose.connection.on('connected', () => {
                console.log('----DATABASE CONNECTION SUCCESSFUL-----');
            });

            mongoose.connection.on('disconnected', () => {
                console.error('Database connection lost');
            });
            mongoose.connection.on("error", () =>{
                console.error("Error connecting to db")
            })
            
            await mongoose.connect(process.env.DB as any)

            

        } catch(error) {
            console.log(error)
        }
    }
}

export default MongoService;