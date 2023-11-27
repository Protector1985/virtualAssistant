import mongoose, {Schema, Document, Model} from "mongoose"



class MongoService {
    private clientData: Schema;
    private model:Model<any>;

    constructor() {
        this.connectMongoDb()

        this.clientData= new Schema({
            clientPhone: {type: String, required: true, unique:true },
            name: {type: String, required: true},
            hours: {type:String, required: true},
            location: {type:String, required: true},
            address: {type: String, required: true},
            businessType: {type: String, required: true},
            orderUrl: {type:String, required: true},
            redirectNumber: {type:String, required: true},
            reservationUrl: {type:String, required: true},
            language: {type:String, required: true},
            turboModel: {type: Boolean, required: true},
            conversationHistory: {type: Map, required: false, default:[]},
            systemPrompt: {type: String, required: true},
            textMessageText: {type: String, required:true},
            reservationText: {type:String, required:true},
            pinLocationText: {type:String, required: true}
        })
        this.model = mongoose.model<any>('Client', this.clientData);
    }

    async findClient(clientPhone:String):Promise<any[]> {
        const client = await this.model.find({clientPhone});
        return client
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
                turboModel: clientData.turboModel,
                systemPrompt: clientData.systemPrompt,
                textMessageText: clientData.textMessageText,
                reservationText: clientData.reservationText,
                pinLocationText: clientData.pinLocationText

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