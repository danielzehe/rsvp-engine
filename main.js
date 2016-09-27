var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID
var express = require('express');
var bodyParser = require('body-parser')
var Base58 = require('base58');



var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var api_router = express.Router();

var url = 'mongodb://rsvp_user:rsvp_user@localhost:27017/rsvp_engine';

var db = null;

/*
*	This makes sure that we are connected to the db before doing any api call.
*/
app.use(function(req,res,next){
	if(db==null){
		MongoClient.connect(url, function(err,_db){
			if(!err){
				console.log("connected");
				db=_db;
				next();
			}
			else {
				console.log(err);
			}
		});
	}
	else {
		next();
	}
})

app.get('/',function(req,res){
	res.status(200).send('All Good');
});

api_router.get('/',function(req,res){
	res.status(200).send("all API Endpoints");
});
/*
*  returns a JSON array of all guests. This will return the data as is in the database, maybe processing should be done.
*/
api_router.get('/guests',function(req,res){
	db.collection('guests').find({}).toArray(function(err,guests){
		if(!err) {
			res.status(200).send(guests);
		}
		else {
			res.status(500).send();
		}
	});
});

/*
*  returns a specific guest as given by the :id parameter.
*  The id is the string representation of the _id in the mongoDB object.
*/
api_router.get('/guest/id/:id',function(req,res){
	var guest_objectid = new ObjectID(req.params.id);
	db.collection('guests').findOne({_id:guest_objectid},function(err,guest){
		if(!err){
			if(guest == null){
				res.status(404).send();
			}	
			else {
				res.status(200).send(guest);
			}
		}
		else {
			res.status(500).send();
		}
	});
});

/*
*  returns a specific guest as given by the :id parameter.
*  The id is a base58 encoded number that is referenced in the personID field of the guest JSON object. 
*/
api_router.get('/guest/personID/:id',function(req,res){
	var guest_personID = req.params.id;
	console.log("personID (b58/int): "+req.params.id+"/"+guest_personID);

	db.collection('guests').findOne({personID:guest_personID},function(err,guest){
		if(!err){
			console.log(guest);
			
			if(guest == null){
				res.status(404).send();
			}	
			else {
				res.status(200).send(guest);
			}
		}
		else  {
			res.status(500).send();
		}
	});
});

/*
*	adds a new guest object to the database. Before adding, the latest personID is requested from the database
*	and increased by one. Possible point of failure when high demand, should be atomic.	
*/

api_router.put('/guest',function(req,res){
	var guest = req.body;

	 db.collection('guests').find({},{_id:0,personID:1}).sort({personID:-1}).limit(1).toArray(function(err,personID){
	 	var nextpersonID = 10000;
	 	if(Object.getOwnPropertyNames(personID[0]).length>0){
	 		nextpersonID = Base58.decode(personID[0].personID)+1;
	 	}

	 	guest.personID = Base58.encode(nextpersonID); 
	 	db.collection('guests').insert(guest,function(err,result){
	 		if(!err){
	 			res.status(200).send();
	 		}
	 		else{
	 			res.status(500).send();
	 		}
	 	});
	 });
});



app.use('/api',api_router);

app.listen(3000,function(){
	console.log('listening on 3000');
});