import mongoose, {Schema, Document, Model} from "mongoose"



class MongoService {
    private clientData: Schema;
    private model:Model<any>;


    constructor() {
        this.connectMongoDb()
        this.clientData= new Schema({
            clientPhone: {type: String, required: true, unique:true },
            name: {type: String, required: false},
            hours: {type:String, required: false},
            location: {type:String, required: false},
            address: {type: String, required: false},
            businessType: {type: String, required: false},
            orderUrl: {type:String, required: false},
            redirectNumber: {type:String, required: false},
            reservationUrl: {type:String, required: false},
            language: {type:String, required: true},
            turboModel: {type: Boolean, required: true}
        })
        this.model = mongoose.model<any>('Client', this.clientData);
        
    }

    async initClientData() {
        const allClients = await this.model.find({});
        
    }

    async addClient(clientData:any) {
        try {
            const newClient = new this.model({
                clientPhone: clientData.clientPhone,
                name: clientData.name,
                hours: clientData.hours,
                location: clientData.location,
                address: clientData.address,
                businessType: clientData.businessType,
                orderUrl: clientData.orderUrl,
                redirectNumber: clientData.redirectNumber,
                reservationUrl: clientData.reservationUrl,
                language: clientData.language,
                turboModel: clientData.turboModel
            });

            await newClient.save();
            return 'Client added successfully'
            
        } catch (error) {
            console.error('Error adding client:', error);
            throw error;
        }
    }

    async connectMongoDb(): Promise<void> {
        try {
            const dbURI = process.env.DB

            if(!dbURI) {
                throw new Error("DB URI has to be provided")
            }

            mongoose.connection.on('connected', () => {
                console.log('----DATABASE CONNECTION SUCCESSFUL-----');
                this.initClientData();
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