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
			
			outguest = guests.map(function(guest){
				guest.personID = Base58.encode(guest.personID);
				return guest;
			})
			res.status(200).send(outguest);
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
api_router.get('/guest/personID/b58/:id',function(req,res){
	var guest_personID = Base58.decode(req.params.id);
	console.log("personID (b58/int): "+req.params.id+"/"+guest_personID);

	db.collection('guests').findOne({personID:guest_personID},function(err,guest){
		if(!err){
			// console.log(guest);
			
			if(guest == null){
				res.status(404).send();
			}	
			else {
				guest.personID = Base58.encode(guest.personID);
				res.status(200).send(guest);
			}
		}
		else  {
			res.status(500).send();
		}
	});
});


api_router.post('/guest/personID/b58/:id',function(req,res){
	var guest_personID = Base58.decode(req.params.id);
	console.log("personID (b58/int): "+req.params.id+"/"+guest_personID);

	var guest = req.body;
	guest.personID = guest_personID;



	console.log(guest);


	db.collection('guests').findOne({personID:guest_personID},function(err1,foundguest){
		guest._id = foundguest._id;
		db.collection('guests').update({_id:foundguest._id},guest,function(err,result){
			// console.log([err,result]);
			if(!err){
				res.status(200).send();
			}
			else {
				res.status(503).send();
			}
		});
	})

})

/*
*	adds a new guest object to the database. Before adding, the latest personID is requested from the database
*	and increased by one. Possible point of failure when high demand, should be atomic.	
*/
api_router.put('/guest',function(req,res){
	var guest = req.body;

	 db.collection('guests').find({},{_id:0,personID:1}).sort({personID:-1}).limit(1).toArray(function(err,personID){
	 	// default value for the personID is 100000
	 	//will only be used when there is no prior object in the database
	 	var nextpersonID = 10000;
	 	if(Object.getOwnPropertyNames(personID[0]).length>0){
	 		nextpersonID = personID[0].personID+1;
	 	}

	 	//encode the personID using base58 and adding it to the object
	 	guest.personID = nextpersonID; 
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

/*
*	returns all invitations in the database. This will return the data as is no changes.
*/
api_router.get('/invitations',function(req,res){
	db.collection('rsvp').find({}).toArray(function(err,invitations){
		if(!err){
			outinvites = invitations.map(function(invitation){
				invitation.inviteID = Base58.encode(invitation.inviteID);

				guests = invitation.guests.map(function(guestid){
					return Base58.encode(guestid);
				});
				invitation.guests = guests;
				return invitation;
			});


			res.status(200).send(outinvites);
		}
		else {
			res.status(500).send();
		}
	});
});

/*
*	adds a new invitation to the database. Before adding, the latest inviteID is requested from the database
* 	and increased by one. Possible point of failure when high demand, should be atomic.	
*/

api_router.put('/invitation',function(req,res){
	var invitation = req.body;
	// get first guest by _ID

	db.collection('rsvp').find({},{_id:0,inviteID:1}).sort({inviteID:-1}).limit(1).toArray(function(err,inviteID){
		var nextinviteID = 10000;
		if(Object.getOwnPropertyNames(inviteID[0]).length>0){
			nextinviteID = inviteID[0].inviteID+1;
		}

		invitation.inviteID = nextinviteID;

		var guestids = invitation.guests.map(function(guest){
			return Base58.decode(guest);
		});
		invitation.guests = guestids;


		db.collection('rsvp').insert(invitation,function(err,result){
			if(!err){
				res.status(200).send();
			}
			else {
				res.status(500).send();
			}
		});

	});
});


api_router.get('/invitation/inviteID/b58/:id',function(req,res){
	var invitation_inviteID = Base58.decode(req.params.id);
	console.log(req.params.id);

	db.collection('rsvp').findOne({inviteID:invitation_inviteID},function(err,invitation){
		if(!err){
			// console.log(guest);
			
			if(invitation == null){
				res.status(404).send();
			}	
			else {
				invitation.inviteID = Base58.encode(invitation.inviteID);


				guests = invitation.guests.map(function(guestid){
					return Base58.encode(guestid);
				});
				invitation.guests = guests;
				res.status(200).send(invitation);
			}
		}
		else  {
			res.status(500).send();
		}
	});
})

api_router.post('/invitation/inviteID/b58/:id',function(req,res){


	var invitation_inviteID = Base58.decode(req.params.id);
	console.log(invitation_inviteID);
	var invitation = req.body;
	invitation.inviteID = invitation_inviteID;


	var guestids = invitation.guests.map(function(guest){
		return Base58.decode(guest);
	});
	invitation.guests = guestids;



	db.collection('rsvp').findOne({inviteID:invitation_inviteID},function(err1,foundinvitation){
		invitation._id = foundinvitation._id;
		db.collection('rsvp').update({_id:foundinvitation._id},invitation,function(err2,result){
			if(!err2){
				res.status(200).send();
			}
			else {
				res.status(503).send();
			}
		});
	});



})


app.use('/api',api_router);

app.listen(3000,function(){
	console.log('listening on 3000');
});