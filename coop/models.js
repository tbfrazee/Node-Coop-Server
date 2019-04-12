let db;

class CoopModel {

    constructor() {
        this.props = {
            table: undefined,
            fields: [],
            pkName: undefined,
            requiresPK: false
        };
        this.status = {
            initialized: false,
            hasData: false,
            loadedfromDB: false
        };
    }

    static batchGetAll(cols) {
        return new Promise(async (resolve, reject) => {
            try {
                let dbRes = await db.get({
                    table: this.props.table,
                    cols: cols
                });
                let ret = [];
                for(let row in dbRes) {
                    let obj = new this();
                    obj.init(dbRes[row]);
                    ret.push(obj);
                }
                return resolve(ret);
            } catch(err) {
                return reject(err);
            }
        });
    }

    static batchGetByFilter(filter, cols) {
        return new Promise(async (resolve, reject) => {
            let ret = [];
            try {
                let rows = await db.get({
                    table: this.props.table,
                    cols: cols,
                    filter: filter
                });
                for(i = 0; i < rows.length; i++) {
                    if(row[this.props.pkName]) {
                        let inst = new this();
                        inst.init(row[i]);
                        ret.push(inst);
                    }
                }
                return resolve(ret);
            } catch(err) {
                return reject("Error getting " + this.constructor.name + ": " + err);
            }
        });
    }

    static batchGetById(ids, cols) {
        return this.batchGetByFilter({
            col: this.props.pkName,
            operator: "IN",
            value: ids
        }, cols);
    }

    static batchGetByFamily(familyIds, cols) {
        return this.batchGetByFilter({
            col: "familyId",
            operator: "IN",
            value: familyIds
        }, cols);
    }

    static batchGetData(objs) {
        let ret = [];
        for(let obj in objs) {
            ret.push(objs[obj].getData());
        }
        return ret;
    }

    isReady() {
        return (this.status.initialized && this.status.hasData);
    }

    getData() {
        let ret = {};
        for(let f in this.props.fields) {
            if(this[this.props.fields[f]])
                ret[this.props.fields[f]] = this[this.props.fields[f]];
        }
        return ret;
    }

    getPK() {
        return this[this.props.pkName];
    }

    init(values) {
        for(let v in values) {
            if(this.props.fields.includes(v)) {
                this[v] = values[v];
                this.status.hasData = true;
            }
        }
        this.initialized = true;
        this.afterLoad();
        return this;
    }

    save(cols) {
        return new Promise(async (resolve, reject) => {
            let op;
            if(!cols)
                cols = this.props.fields;
            let values = {};
            for(let f in this.props.fields) {
                if(this[this.props.fields[f]] && cols.includes(this.props.fields[f]))
                    values[this.props.fields[f]] = this[this.props.fields[f]];
            }

            if(!this[this.props.pkName]) {
                if(!this.props.requiresPK) {
                    op = "insert";
                } else {
                    return reject(this.props.pkName + " is required to save this " + this.constructor.name);
                }
            } else if(this[this.props.pkName]) {
                try {
                    let dbRes = await db.get({
                        table: this.props.table,
                        cols: [this.props.pkName],
                        filter: { col: this.props.pkName, value: this[this.props.pkName] }
                    }, true);
                    if(dbRes)
                        op = "update";
                    else
                        op = "insert";
                } catch(err) {
                    return reject("Error getting item status: " + err);
                }
            }

            try {
                if(op == "insert") {
                    let dbRes = await db.insert({
                        table: this.props.table,
                        values: values
                    });
                    if(!this[this.props.pkName])
                        this[this.props.pkName] = dbRes.lastInsertROWID;
                } else if(op = "update") {
                    let dbRes = await db.update({
                        table: this.props.table,
                        values: values,
                        filter: { col: this.props.pkName, value: this[this.props.pkName] }
                    });
                } else {
                    return reject("Unable to determine save method.");
                }
                return resolve(this);
            } catch(err) {
                return reject("Error with " + op + ": " + err);
            }
        });
    }

    load(id, cols) {
        return new Promise(async (resolve, reject) => {
            if(!id)
                return reject("Id is required.");
            try {
                let data = await db.get({
                    table: this.props.table,
                    cols: cols,
                    filter: [{ col: this.props.pkName, value: id }]
                }, true);
                if(data) {
                    for(let f in data) {
                        this[f] = data[f];
                    }
                    this.initialized = true;
                    this.hasData = true;
                    this.loadedFromDB = true;
                    this.afterLoad();
                } else {
                    this.initialized = true;
                    this.loadedFromDB = false;
                    this.hasData = false;
                }
                return resolve(this);
            } catch(err) {
                return reject(err);
            }
        });
    }

    async afterLoad() {
        //Get Users
        if(this.userFields || this.userListFields) {
            let uids = [];
            let users;

            for(let field in this.userFields) {
                if(this[this.userFields[field]])
                    uids.push(this[this.userFields[field]]);
            }
            for(let field in this.userListFields) {
                if(this[this.userListFields[field]])
                    uids.concat(this[this.userListFields[field]].split(','));
            }

            if(uids.length) {
                users = await User.batchGetById(uids);
                for(let user in users) {
                    for(let field in this.userFields) {
                        if(users[user].userId == this[this.userFields[field]]) {
                            this[this.userFields[field]] = users[user];
                        }
                    }
                    for(let field in this.userListFields) {
                        this[this.userListFields[field]] =
                            this[this.userListFields[field]].includes(users[user].userId) ? users[user] : [];
                    }
                }
            }
        }

        //Get Families
        if(this.familyFields || this.familyListFields) {
            let fids = [];
            let families;

            for(let field in this.familyFields) {
                if(this[this.familyFields[field]])
                    fids.push(this[this.familyFields[field]]);
            }
            for(let field in this.familyListFields) {
                if(this[this.familyListFields[field]])
                    fids.concat(this[this.familyListFields[field]].split(','));
            }

            if(fids.length) {
                families = await Family.batchGetById(fids);
                for(let family in families) {
                    for(let field in this.familyFields) {
                        if(families[family].familyId == this[this.familyFields[field]]) {
                            this[this.familyFields[field]] = families[family];
                        }
                    }
                    for(let field in this.familyListFields) {
                        this[this.familyListFields[field]] =
                            this[this.familyListFields[field]].includes(families[family].familyId) ? families[family] : [];
                    }
                }
            }
        }

        //Get Children
        if(this.childFields || this.childListFields) {
            let cids = [];
            let children;

            for(let field in this.childFields) {
                if(this[this.childFields[field]])
                    cids.push(this[this.childFields[field]]);
            }
            for(let field in this.childListFields) {
                if(this[this.childListFields[field]])
                    cids.concat(this[this.childListFields[field]].split(','));
            }

            if(cids.length) {
                children = await Child.batchGetById(cids);
                for(let child in children) {
                    for(let field in this.childFields) {
                        if(children[child].childId == this[this.childFields[field]]) {
                            this[this.childFields[field]] = children[child];
                        }
                    }
                    for(let field in this.childListFields) {
                        this[this.childListFields[field]] =
                            this[this.childListFields[field]].includes(children[child].childId) ? children[child] : [];
                    }
                }
            }
        }
    }

    erase(id) {
        return new Promise(async (resolve, reject) => {
            if(!id)
                return reject("Id is required.");
            try {
                let dbRes = await db.erase({
                    table: this.props.table,
                    filter: { col: this.props.pkName, value: this[this.props.pkName] }
                });
                return resolve();
            } catch(err) {
                return reject("Error deleting: " + err);
            }
        });
    }
}

class User extends CoopModel {

    constructor() {
        super();
        this.props.fields = ["userId", "familyId", "firstName", "lastName", "bio", "email", "phone", "contactPref", "training"];
        this.props.table = "Users";
        this.props.pkName = "userId";
        this.props.requiresPK = true;
        this.props.familyFields = ["familyId"];
    }
}

class Family extends CoopModel {
    constructor() {
        super();
        this.props.fields = ["familyId", "address", "household", "emergencyContacts", "houseAdults", "houseChildren", "housePets", "comment", "children"];
        this.props.table = "Families";
        this.props.pkName = "familyId";
        this.props.childListFields = ["children"];
    }
}

class Child extends CoopModel {
    constructor(options) {
        super();
        this.props.fields = ["childId", "familyId", "firstName", "lastName", "gender", "birthdate", "medicalContact", "medications", "medicationAllergies", "foodAllergies", "otherAllergies", "miscMedical", "behavior", "mealRoutine", "bedRoutine"];
        this.props.table = "Children";
        this.props.pkName = "childId";
        this.props.familyFields = ["familyId"];
    }
}

class Request extends CoopModel {
    constructor() {
        super();
        this.props.fields = ["requestId", "requestedBy", "startTime", "endTime", "children", "comment", "assignedTo", "fulfillTimes", "fulfilled", "fbPostId"];
        this.props.table = "Requests";
        this.props.pkName = "requestId";
        this.props.userFields = ["requestedBy"];
        this.props.userListFields = ["assignedTo"];
        this.props.childListFields = ["children"];
    }
}

module.exports = {
    init: function(database) { db = database;},
    User,
    Family,
    Child,
    Request
}