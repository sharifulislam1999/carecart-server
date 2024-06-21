require('dotenv').config()
const express = require("express");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://b9a12-73e3e.web.app",
      "https://b9a12-73e3e.firebaseapp.com",
    ]
  })
);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.guoefzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // all collection
    const usersCollection = client.db('medicalDatabase').collection("users");
    const categoryCollection = client.db('medicalDatabase').collection("category");
    const medicineCollection = client.db('medicalDatabase').collection("medicine");
    const bannerCollection = client.db('medicalDatabase').collection("banner");
    const adsRequestCollection = client.db('medicalDatabase').collection("bannerrequest");
    const cartCollection = client.db('medicalDatabase').collection('cart')
    const paymentCollection = client.db('medicalDatabase').collection('payments')
    const invoiceCollection = client.db('medicalDatabase').collection('invoice')
    // middle ware
    const verifyToken = (req,res,next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message: "forbidden access"});
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
        if(err){
          return res.status(401).send({message:"forbidden access"})
        }
        req.decoded = decoded;
        next();
      });
    }
    const verifyAdmin = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email:email}
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if(!isAdmin){
        return res.status(403).send({message:"Forbidden Access"})
      }
      next();
    }
    const verifySeller = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email:email}
      const user = await usersCollection.findOne(query);
      const isSeller = user?.role === "seller";
      if(!isSeller){
        return res.status(403).send({message:"Forbidden Access"})
      }
      next();
    }
    app.patch('/user/:id/:role',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const role = req.params.role;
      // console.log(id,role);
      const filter = {_id:new ObjectId(id)};
      const updatedDoc = {
        $set:{
          role: role
        }
      }
      const result = await usersCollection.updateOne(filter,updatedDoc);
      res.send(result);    
    })
    app.post('/banner',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const result = await bannerCollection.insertOne(req.body);
      res.send(result)
    })
    app.get('/banner',async(req,res)=>{
  
      const result = await bannerCollection.find().toArray();
      res.send(result)
    })
    app.delete('/banner/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const query = {_id: id};
      const result = await bannerCollection.deleteOne(query);
      res.send(result);
    })
    



    // pagination
    // app.get('/allmedicine')




    // pagination

    app.patch('/banner/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const filter = {_id: id};
      const data = req.body;
      // console.log(id,data);
      const updatedData = {
        $set:{          
            medicineName:data.medicineName,
            genericName:data.genericName,
            medicineImage:data.medicineImage,
            medicineBgImage:data.medicineBgImage,
            medicineCategory:data.medicineCategory,
            medicineCompany:data.medicineCompany,
            medicineUnit:data.medicineUnit,
            medicinePrice:data.medicinePrice,
            medicineDiscount:data.medicineDiscount,
            medicineDes:data.medicineDes,
        }
      }
      const result = await bannerCollection.updateOne(filter,updatedData)
      res.send(result)

    })
    app.post('/category',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const category = req.body;
      const find = await categoryCollection.findOne({categoryName:category.categoryName});
      if(find){
       return res.send({message:"already added"})
      }
      const result = await categoryCollection.insertOne(category);
      res.send(result);
    })
    app.get("/category",async(req,res)=>{
      const result = await categoryCollection.find().toArray();
      res.send(result)
    })
    app.get('/categorycount/:name',async(req,res)=>{
      const name = req.params.name;
      const query = {medicineCategory:name}
      const result = await medicineCollection.find(query).toArray();
      const count = result.length
      res.send({count:count,data:result})


    })
    app.delete('/user/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await usersCollection.deleteOne(query)
      res.send(result);
    })
    app.delete('/category/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await categoryCollection.deleteOne(query)
      res.send(result);
    })
    app.patch('/category/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const getData = req.body;
      const fileter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{          
            categoryName:getData.categoryName,
            categoryImg:getData.categoryImg,
            categoryDes:getData.categoryDes
        }
      }
      const result = await categoryCollection.updateOne(fileter,updatedDoc);
      res.send(result);

    })

    app.get('/getrole/:email',async(req,res)=>{
      const email = req.params.email;
      // console.log('before',email)
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      // console.log("user",user)
      let role = "dsf";
      if(user){
        role = user?.role;
      }
      // console.log(user,email)
      res.send({role:role});
    });
    app.post('/medicine',verifyToken,verifySeller,async(req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const medicine = req.body;
      const find = await medicineCollection.findOne({medicineName:medicine.medicineName})
      if(find){
        return res.send({message:"already added"})      }
      const result = await medicineCollection.insertOne(medicine)
      res.send(result);
    });
    app.get('/medicine/:email',verifyToken,verifySeller,async (req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const email = req.params.email;
      const query = {seller:email};
      const result = await medicineCollection.find(query).toArray();
      res.send(result)
    });
    app.get('/medicinediscount',async (req,res)=>{
      const query = {medicineDiscount:{$ne:"0"}}
      const result = await medicineCollection.find(query).toArray();
      res.send(result);      
    })
    app.get('/allmedicine',async(req,res)=>{
      // console.log(req.query);
      const sort = req.query.sort;
      const search = req.query.search || "";
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {        
          $or:[
            {medicineName:{$regex:search,$options:"i"}},
            {genericName:{$regex:search,$options:"i"}},
            {medicineCompany:{$regex:search,$options:"i"}}
          ]
        
      }
      const result = await medicineCollection.find(query).sort({medicinePrice: sort === 'high' ? 1:-1})
      .skip(page * size)
      .limit(size)
      .toArray()
      res.send(result)
    })
    app.get('/categorypagination',async(req,res)=>{
      const sort = req.query.sort;
      const search = req.query.search || "";
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const category = req.query.category;
      const query = {   
        medicineCategory:category,     
        $or:[
          {medicineName:{$regex:search,$options:"i"}},
          {genericName:{$regex:search,$options:"i"}},
          {medicineCompany:{$regex:search,$options:"i"}}
        ]
        
      }
      console.log(search,sort)
      const result = await medicineCollection.find(query)
      .sort({medicinePrice: sort === 'high' ? 1:-1})
      .skip(page * size)
      .limit(size)
      .toArray();
      res.send(result)
      
    })
    
    app.post('/addrequest',verifyToken,verifySeller,async (req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const data = req.body;
      // console.log(data)
      const result = await adsRequestCollection.insertOne(data);
      res.send(result);
    })
    app.get('/bannerrequest',verifyToken,verifyAdmin,async (req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      // console.log("yes")
      const query = {status: {$eq:'pending'}}
      const result = await adsRequestCollection.find(query).toArray();
      res.send(result)
    })
    app.get('/sellerbanner/:email',verifyToken,verifySeller,async(req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const email = req.params.email;
      const result = await adsRequestCollection.find({seller:email}).toArray();
      res.send(result)
    })
    app.patch('/bannerrequest/:id',async(req,res)=>{
      const id = req.params.id;
      const data = req.body;
      const query = {_id: new ObjectId(id)}
      const updated = {
        $set:{
          status: data.status
        }
      }
      const result = await adsRequestCollection.updateOne(query,updated);
      res.send(result)

      
    })
    app.patch('/medicine/:id',verifyToken,verifySeller,async(req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const data = req.body;
      // console.log(id,data);
      const updatedData = {
        $set:{          
            medicineName:data.medicineName,
            genericName:data.genericName,
            medicineImage:data.medicineImage,
            medicineCategory:data.medicineCategory,
            medicineCompany:data.medicineCompany,
            medicineUnit:data.medicineUnit,
            medicinePrice:data.medicinePrice,
            medicineDiscount:data.medicineDiscount,
            medicineDes:data.medicineDes,
        }
      }
      const result = await medicineCollection.updateOne(filter,updatedData)
      res.send(result)

    })
    app.delete('/medicale/:id',verifyToken,verifySeller,async(req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await medicineCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/categories',async(req,res)=>{
      const result = await categoryCollection.find().toArray();
      res.send(result)
    })
    app.get('/user',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'1h'});
      res.send({token})
    })



    // cart api
    app.post('/cart',verifyToken,async(req,res)=>{
      const cart = req.body;
      const find = await cartCollection.findOne({menuId: cart.menuId})
      if(find){
        return res.send({message:"already added"})
      }
      const result = await cartCollection.insertOne(cart)
      res.send(result)      
    })
    
    app.get('/cart', async (req,res)=>{
      const query = req.query;
      const result = await cartCollection.find({user:query.email}).toArray();
      res.send(result)
    })


    // payment intent
    app.post('/makepayment',async(req,res)=>{
      const {price} = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // set payment
    app.post('/savepayment',async(req,res)=>{
      const payment = req.body;
      const InsertPayment = await paymentCollection.insertMany(payment)      
      const cartId = payment.map(item => new ObjectId(item._id));
      const cartDelete = {_id:{$in:cartId}}
      const clearCart = await cartCollection.deleteMany(cartDelete)      
      // res.send({payment:InsertPayment,cart:clearCart})
      res.send({payment:InsertPayment,cart:clearCart});
    })
    app.delete('/cart/:id',verifyToken,async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result)

    })
    app.delete('/clearcart/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      const query = {user: email}
      const result = await cartCollection.deleteMany(query);
      res.send(result)

    })
    app.get('/payments',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const  result = await paymentCollection.find().toArray();
      res.send(result);
    })
    app.get('/adminpayments',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const  result = await paymentCollection.find().sort({_id: -1}).toArray();
      res.send(result);
    })
    app.get('/sellerpayment/:email', async(req,res)=>{
      const email = req.params.email;
      const payments = await paymentCollection.find({seller:email}).sort({_id: -1}).toArray();
      res.send(payments)
  });
  
  
    app.patch('/cart',verifyToken,async(req,res)=>{      
      const linkQuery = req.query;
      if(linkQuery.dep === "i"){
        const find = await cartCollection.findOne({_id: new ObjectId(linkQuery.id)});
        const updatedDocs = {
            $set:{
              quantity: parseInt(find.quantity) + 1
            }
          }        
        const result = await cartCollection.updateOne({_id:new ObjectId(linkQuery.id)},updatedDocs);
        res.send(result)
      }else if(linkQuery.dep === "d"){
        const find = await cartCollection.findOne({_id: new ObjectId(linkQuery.id)});
        const updatedDocs = {
            $set:{
              quantity: parseInt(find.quantity) - 1
            }
          }        
        const result = await cartCollection.updateOne({_id:new ObjectId(linkQuery.id)},updatedDocs);
        res.send(result)       
      }
    });  
    // app.get('/payments/:id',async(req,res)=>{
    //   const id = req.params.id;
    //   const result = await paymentCollection.findOne({_id:new ObjectId(id)});
    //   res.send(result);
    // })

    app.patch('/payments/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const id = req.params.id;
      const filter = {transId: id};
      const updatedDocs  = {
        $set:{
          status: "paid"
        }
      }
      const result = await paymentCollection.updateMany(filter,updatedDocs)
    // console.log()
    res.send(result)
    });

    app.get("/salesreport",verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      if(req.query.start && req.query.endDate){
        // console.log(req.query.start,req.query.endDate)
        const convertToDate =  (dateString)=>{
          const [day,month,year] = dateString.split('/').map(Number);
          return new Date(year,month-1,day)
        }
        // console.log(new Date(req.query.start))
        // console.log(new Date(req.query.endDate))
        const result = await paymentCollection.find({
          date:{
            $gte: new Date(req.query.start),
            $lte: new Date(req.query.endDate)
          }
        }).toArray();

        // console.log(req.query)
      return res.send(result)
      }else{
        const result = await paymentCollection.find().toArray();
        return res.send(result)
      }
    })


    // admin stack
    app.get('/adminstacks', verifyToken,verifyAdmin, async(req,res)=>{
      const email = req.decoded.email;
      const rule = await usersCollection.findOne({email:email})
      if(rule.role !== 'admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const totalRes = await paymentCollection.find().toArray();
      const totalUnpaidRes = await paymentCollection.find({status:'paid'}).toArray();
      const totalPaidRes = await paymentCollection.find({status:'pending'}).toArray();
      const totalSales = totalRes.reduce((a,i)=>  parseInt(i.price) + a,0);
      const totalPaid = totalUnpaidRes.reduce((a,i)=>  parseInt(i.price) + a,0);
      const totalUnPaid = totalPaidRes.reduce((a,i)=>  parseInt(i.price) + a,0);
      res.send({totalSales,totalPaid,totalUnPaid})
    })
    app.get('/sellerstack/:email',verifyToken,verifySeller,async(req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const email = req.params.email;
      const totalRes = await paymentCollection.find({seller:email}).toArray();
      const totalUnpaidRes = await paymentCollection.find({seller:email,status:'paid'}).toArray();
      const totalPaidRes = await paymentCollection.find({seller:email,status:'pending'}).toArray();
      const totalSales = totalRes.reduce((a,i)=>  parseInt(i.price) + a,0);
      const totalPaid = totalUnpaidRes.reduce((a,i)=>  parseInt(i.price) + a,0);
      const totalUnPaid = totalPaidRes.reduce((a,i)=>  parseInt(i.price) + a,0);
      res.send({totalSales,totalPaid,totalUnPaid})
    })
    app.get('/sellerpayment',verifyToken,verifySeller,async(req,res)=>{
      const emailDec = req.decoded.email;
      const rule = await usersCollection.findOne({email:emailDec})
      if(rule.role !== 'seller'){
        return res.status(403).send({message:'forbidden access'})
      }
      const result = await paymentCollection.aggregate([
        {
            $unwind:'$menuId'
        },
        {
          $addFields: {
            menuId: { $toObjectId: "$menuId" }
          }
        },
        {
          $lookup:{
            from: "medicine",
            localField: 'menuId',
            foreignField: "_id",
            as: 'menuItems'
          }
        },
        {
          $unwind:'$menuItems'
        },
        {
          $group:{
            _id: '$menuItems'
          }
        }
    
    ]).toArray(); 
    res.send(result)
    })
    app.get('/userpayment/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      const find = await paymentCollection.find({user:email}).sort({_id:-1}).toArray();
      res.send(find)
    })



    app.post('/invoice',async (req,res)=>{
      const data = req.body;
      const result = await invoiceCollection.insertOne(data)
      res.send(result)
    })
    app.get('/invoice/:id',async (req,res)=>{
      const find = {_id:new ObjectId(req.params.id)}
      const result = await invoiceCollection.findOne(find)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    app.post('/users',async(req,res)=>{
      const user = req.body;
      const existUser = await usersCollection.findOne({email:user.email})
      if(existUser){
        return res.send({message:'User already exist'});
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
      // console.log('body',user)
    })
   
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close()f;
  }
}
run().catch(console.dir);
app.get('/',(req,res)=>{
    res.send('server in waiting for your magic')
})
app.listen(port,()=>{
    console.log(`server running on port ${port}`)
})
