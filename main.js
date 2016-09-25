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

api_router.get('/guests',function(req,res){
	db.collection('guests').find({}).toArray(function(err,guests){
		if(!err)
			res.status(200).send(guests);
	});
});
//this id is the mongodb objectID
api_router.get('/guest/id/:id',function(req,res){
	var guest_objectid = new ObjectID(req.params.id);
	db.collection('guests').findOne({_id:guest_objectid},function(err,guest){
		if(!err)
			res.status(200).send(guest);
	});
});

//this id is base58
api_router.get('/guest/personID/:id',function(req,res){
	var guest_personID = Base58.decode(req.params.id);
	console.log("personID (b58/int): "+req.params.id+"/"+guest_personID);

	db.collection('guests').findOne({personID:guest_personID},function(err,guest){
		if(!err){
			console.log(guest)
			res.status(200).send(guest);
		}
	});

});

// api_router.put('/guest',function(req,res){
// 	var guest = req.body;

	

// 	res.status(200).send();
// });



app.use('/api',api_router);

app.listen(3000,function(){
	console.log('listening on 3000');
});