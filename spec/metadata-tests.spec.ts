import { Entity, EntityQuery, EntityType, MetadataStore, EntityChangedEventArgs, EntityAction, MergeStrategy, QueryOptions, FetchStrategy, EntityManager, breeze, DataProperty, AutoGeneratedKeyType, NamingConvention, core, config, DataServiceAdapter, DataService, NavigationProperty } from 'breeze-client';
import { TestFns, skipTestIf } from './test-fns';

TestFns.initServerEnv();

beforeAll(async () => {
  await TestFns.initDefaultMetadataStore();

});

type JsonObj = {[k: string]: any};

describe("Metadata", () => {

  beforeEach(function () {

  });

  test("add custom metadata", function () {
    const em = TestFns.newEntityManager();
    const store = em.metadataStore;

    const custType = store.getEntityType("Customer");
    const namespace = custType.namespace;
    expect(store.hasMetadataFor(TestFns.defaultServiceName)).toBe(true);
    const customMetadata = makeCustomMetadata(namespace);
    store.importMetadata(customMetadata, true);

    checkCustomType(custType);
    checkCustomProp(custType, TestFns.wellKnownData.keyNames.customer);
    checkCustomProp(custType, "companyName");
    checkCustomProp(custType, "orders");

  });

  test("export/import custom metadata", function () {
    const em = TestFns.newEntityManager();
    const store = em.metadataStore;

    const custType = store.getEntityType("Customer");
    const namespace = custType.namespace;
    expect(store.hasMetadataFor(TestFns.defaultServiceName));
    const customMetadata = makeCustomMetadata(namespace);
    store.importMetadata(customMetadata, true);
    const exported = store.exportMetadata();
    const store2 = new MetadataStore();
    store2.importMetadata(exported);

    const custType2 = store2.getEntityType("Customer");
    checkCustomType(custType2);
    checkCustomProp(custType2, TestFns.wellKnownData.keyNames.customer);
    checkCustomProp(custType2, "companyName");
    checkCustomProp(custType2, "orders");

  });


  test("create metadata add entity Type + custom ctor", function () {
    const store = new MetadataStore();
    let eto: JsonObj = {}; 
    eto.shortName = "type1";
    eto.namespace = "mod1";
    eto.dataProperties = new Array();
    eto.autoGeneratedKeyType = AutoGeneratedKeyType.Identity;
    eto.custom = makeCustomTypeAnnot("type1");

    let dpo: JsonObj = {};
    dpo.name = "id";
    dpo.dataType = breeze.DataType.Int32;
    dpo.isNullable = false;
    dpo.isPartOfKey = true;
    dpo.custom = makeCustomPropAnnot("id");

    let dp = new DataProperty(dpo);
    eto.dataProperties.push(dp);

    dpo = {};
    dpo.name = "prop1";
    dpo.dataType = breeze.DataType.Int32;
    dpo.isNullable = false;
    dpo.isPartOfKey = false;
    dpo.custom = makeCustomPropAnnot("prop1");

    dp = new breeze.DataProperty(dpo);
    eto.dataProperties.push(dp);

    const et = new breeze.EntityType(eto);
    store.addEntityType(et);
    expect(et.metadataStore).toBe(store);

    const custType = store.getEntityType("type1");
    checkCustomType(custType);
    checkCustomProp(custType, "id");
    checkCustomProp(custType, "prop1");
  });

  test("create metadata add entity Type - v2 + custom setProperties", function () {
    const store = new MetadataStore();
    let eto: JsonObj = {};
    eto.shortName = "type1";
    eto.namespace = "mod1";
    eto.dataProperties = new Array();
    eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;
    const et = new EntityType(eto);
    et.setProperties({ custom: makeCustomTypeAnnot("type1") });

    let dpo: JsonObj = {};
    dpo.name = "id";
    dpo.dataType = breeze.DataType.Int32;
    dpo.isNullable = false;
    dpo.isPartOfKey = true;

    let dp = new DataProperty(dpo);
    et.addProperty(dp);
    dp.setProperties({ custom: makeCustomPropAnnot("id") });

    dpo = {};
    dpo.name = "prop1";
    dpo.dataType = breeze.DataType.Int32;
    dpo.isNullable = false;
    dpo.isPartOfKey = false;

    dp = new DataProperty(dpo);
    et.addProperty(dp);
    dp.setProperties({ custom: makeCustomPropAnnot("prop1") });

    store.addEntityType(et);

    expect(et.metadataStore).toBe(store);

    checkCustomType(et);
    checkCustomProp(et, "id");
    checkCustomProp(et, "prop1");

  });

  

  test("fetchMetadata", async function () {
    expect.hasAssertions();
    const store = new MetadataStore();

    await store.fetchMetadata(TestFns.defaultServiceName);
    expect(store.isEmpty()).toBe(false);
  });

  test("getEntityType informative error message1", function () {
    const store = new MetadataStore();
    const em = new EntityManager({ serviceName: TestFns.defaultServiceName, metadataStore: store });

    try {
      const customer = em.createEntity("Customer", { customerID: breeze.core.getUuid() });
      throw new Error("Shouldn't get here");
    } catch (err) {
      expect(err.message).toMatch(/fetchMetadata/);
    }
  });

  test("getEntityType informative error message2", function () {
    const store = new MetadataStore();
    const em = new EntityManager({ serviceName: TestFns.defaultServiceName, metadataStore: store });

    try {
      const productType = em.metadataStore.getEntityType("Customer");
      throw new Error("Shouldn't get here");
    } catch (err) {
      expect(err.message).toMatch(/fetchMetadata/);
    }
  });

    // "sequelize", "uses a server side json metadata file"
    skipTestIf(TestFns.isSequelizeServer, "initialization", async function () {
      expect.hasAssertions();
      const store = new MetadataStore({ namingConvention: NamingConvention.none });

      const dataServiceAdapter = config.getAdapterInstance("dataService") as DataServiceAdapter;
      const dataService = new breeze.DataService({ serviceName: TestFns.defaultServiceName });
      await dataServiceAdapter.fetchMetadata(store, dataService);
      const typeMap = store._structuralTypeMap;
      const types = Object.values(typeMap);
      expect(types.length).toBeGreaterThan(0);
      const custType = store.getEntityType("Customer");
      const props = custType.dataProperties;
      expect(props.length).toBeGreaterThan(0);
      const keys = custType.keyProperties;
      expect(keys.length).toBeGreaterThan(0);
      // some servers (hibernate) may use lower case prop names.
      const prop = custType.getProperty("CompanyName") || custType.getProperty("companyName");
      expect(prop).toBeTruthy();
      expect(prop.isDataProperty).toBe(true);
      const navProp = custType.navigationProperties[0];
      expect(navProp.isNavigationProperty).toBe(true);
      const notProp = custType.getProperty("foo");
      expect(notProp).toBeFalsy();
    });

  test("metadata is only initialized once", async function () {
    expect.hasAssertions();
    const store = new MetadataStore();
    const em = new EntityManager({ serviceName: TestFns.defaultServiceName, metadataStore: store });

    await store.fetchMetadata(TestFns.defaultServiceName);
    expect(store.isEmpty()).toBe(false);
    expect(store.hasMetadataFor(TestFns.defaultServiceName)).toBe(true);
    expect(em.metadataStore.hasMetadataFor(em.serviceName)).toBe(true);
  });

  test("metadata with concurrent initialization", async function () {
    expect.hasAssertions();
    const store = new MetadataStore();
    const dataServiceAdapter = config.getAdapterInstance("dataService") as DataServiceAdapter;
    const dataService = new breeze.DataService({ serviceName: TestFns.defaultServiceName });

    let typeMap1, typeMap2;
    const p1 = dataServiceAdapter.fetchMetadata(store, dataService).then( () => {
      typeMap1 = store._structuralTypeMap;
    });
    const p2 = dataServiceAdapter.fetchMetadata(store, dataService).then( () => {
      typeMap2 = store._structuralTypeMap;

    });
    await Promise.all([p1, p2]);
    expect(typeMap1).toBeTruthy();
    expect(typeMap2).toBeTruthy();
  });

  function importMetadataWithInheritance(metadataJson: string | Object) {
    const store = new MetadataStore({ namingConvention: breeze.NamingConvention.none });
    store.importMetadata(metadataJson);
    const em = new EntityManager({ metadataStore: store });
    const apple = em.createEntity("Apple", { Variety: "Jonathan", Name: "Apple", Id: 23 });
    expect(apple.entityAspect.entityState).toBe(breeze.EntityState.Added);
    expect(apple.getProperty("Variety")).toBe("Jonathan");
    expect(apple.getProperty("Name")).toBe("Apple");
    expect(apple.getProperty("Id")).toBe(23);

    const iopType = store.getEntityType("ItemOfProduce");
    const customTypeInfo = iopType.custom;

    checkCustomType(iopType);
    checkCustomProp(iopType, "Id");
  }

  test("importMetadata - metadataItemFruitApple", function () {
    importMetadataWithInheritance(metadataItemFruitApple);
  });
  test("importMetadata - metadataAppleFruitItem", function () {
    importMetadataWithInheritance(metadataAppleFruitItem);
  });
  test("importMetadata - metadataFruitAppleItem", function () {
    importMetadataWithInheritance(metadataFruitAppleItem);
  });

  test("nonscalar dataproperty", function () {
    const jsonMetadata = {
      "metadataVersion": "1.0.5",
      "namingConvention": "camelCase",
      "localQueryComparisonOptions": "caseInsensitiveSQL",
      "dataServices": [
        { "serviceName": "breeze/myservice/" }
      ],
      "structuralTypes": [
        {
          "shortName": "Address",
          "namespace": "mynamespace",
          "isComplexType": true,
          "dataProperties": [
            { "name": "street" },
            { "name": "city" },
          ]
        },
        {
          "shortName": "Person",
          "namespace": "mynamespace",
          "autoGeneratedKeyType": "Identity",
          "defaultResourceName": "Person",
          "dataProperties": [
            {
              "name": "_id", "dataType": "MongoObjectId", "isNullable": false, "defaultValue": "",
              "isPartOfKey": true
            },
            { "name": "displayName", "dataType": "String" },
            {
              "name": "addresses",
              "complexTypeName": "Address:#mynamespace",
              "isScalar": false
            }
          ]
        }
      ],
      "resourceEntityTypeMap": {
        "Person": "Person:#mynamespace"
      }
    };

    const manager = new EntityManager();
    manager.metadataStore.importMetadata(jsonMetadata);

    const person = manager.createEntity('Person', { displayName: "Joe Bob" });
    let myAddresses = person.getProperty('addresses');
    const myAddressProp = manager.metadataStore.getAsComplexType("Address").createInstance(
      { street: "Main", city: "Pleasantville" });
    myAddresses.push(myAddressProp);

    // Complex property is a circular datatype, cannot convert to JSON - that's fine
    // ... except that manager.exportEntities() doesn't handle that case!"
    const entities = manager.exportEntities(); // also fails
    const manager2 = new EntityManager();
    manager2.importEntities(entities);
    const entities2 = manager2.getEntities();
    expect(entities2.length).toBe(1);
    const person2 = entities2[0];
    myAddresses = person.getProperty('addresses');
    expect(myAddresses.length).toBe(1);
    expect(myAddresses[0].getProperty("city")).toBe("Pleasantville");

  });


  // testFns.skipIf("hibernate", "does not yet have TimeList and TimeGroup tables").

  test("create metadata and use it for save - CodeFirst only", async function () {

    expect.hasAssertions();
    const em = createEmWithTimeGroupMetadata();

    const timeGroupType = em.metadataStore.getEntityType("TimeGroup");
    expect(timeGroupType).toBeTruthy();

    const timeGroup = em.createEntity('TimeGroup', {
      comment: "This was added for a test"
    });

    const data = await em.saveChanges();
    const timeGroupId = timeGroup.getProperty("id");
    expect(timeGroupId).toBeGreaterThan(0);

  });

  // testFns.skipIf("hibernate", "does not yet have TimeList and TimeGroup tables").
  test("create metadata and insert using existing entity re-attached - CodeFirst only", async function () {
    expect.hasAssertions();
    
    const em = createEmWithTimeGroupMetadata();

    const timeGroupType = em.metadataStore.getEntityType("TimeGroup");
    expect(timeGroupType).toBeTruthy();

    const q = new EntityQuery()
      .from("TimeGroups")
      .take(2);
    const qr1 = await em.executeQuery(q);

    const timeGroup = qr1.results[0];
    em.detachEntity(timeGroup);
    em.attachEntity(timeGroup, breeze.EntityState.Added);
    timeGroup.setProperty("id", -1);
    timeGroup.setProperty("comment", "This was re-attached");
    const sr = await em.saveChanges();
    const timeGroupId = timeGroup.getProperty("id");
    expect(timeGroupId).toBeGreaterThan(0);
  });


  test("create metadata - multiple subtypes with same navigation properties", function () {

    const em = createEmWithTimeGroupMetadata(true);

    const timeGroupType = em.metadataStore.getEntityType("TimeGroup");
    expect(timeGroupType).toBeTruthy();

    const fooBarType = em.metadataStore.getEntityType("FooBar");
    expect(fooBarType).toBeTruthy();

    const testComment1 = "This was added to TimeGroup";
    const testComment2 = "This was added to FooBar";

    const timeGroup = em.createEntity('TimeGroup', {
      comment: testComment1
    });
    expect(timeGroup.getProperty("comment")).toBe(testComment1);

    const fooBar = em.createEntity('FooBar', {
      comment: testComment2
    });
    expect(fooBar.getProperty("comment")).toBe(testComment2);
  });



  function makeCustomTypeAnnot(typeName: string) {
    return {
      "foo": 7,
      "bar": typeName,
      "fooBar": {
        "x": 8,
        "y": 9,
        "z": true
      }
    };
  }

  function makeCustomPropAnnot(propName: string) {
    return {
      "fooDp": 7,
      "barDp": propName,
      "fooBarDp": {
        "x": 8,
        "y": 9,
        "z": true
      }
    };
  }

  function checkCustomType(stype: any) {
    expect(stype.custom).toBeTruthy();
    expect(stype.custom.foo).toBe(7);
    expect(stype.custom.bar).toBe(stype.shortName);
    expect(stype.custom.fooBar.x).toBe(8);
    expect(stype.custom.fooBar.z).toBe(true);
  }

  function checkCustomProp(stype: any, name: string) {
    const prop = stype.getProperty(name);
    expect(prop.custom).toBeTruthy();
    expect(prop.custom.fooDp).toBe(7);
    expect(prop.custom.barDp).toBe(name);
    expect(prop.custom.fooBarDp.x).toBe(8);
    expect(prop.custom.fooBarDp.z).toBe(true);
  }

  const appleType: JsonObj = {
    "shortName": "Apple",
    "namespace": "Models.Produce",
    "baseTypeName": "Fruit:#Models.Produce",
    "autoGeneratedKeyType": "None",
    "defaultResourceName": "Apples",
    "dataProperties": [
      {
        "nameOnServer": "Variety",
        "dataType": "String",
        "isNullable": true,
        "maxLength": 50,
        "validators": [
          {
            "maxLength": "50",
            "name": "maxLength"
          }
        ]
      }
    ],
    "navigationProperties": []
  };

  const fruitType: JsonObj = {
    "shortName": "Fruit",
    "namespace": "Models.Produce",
    "baseTypeName": "ItemOfProduce:#Models.Produce",
    "autoGeneratedKeyType": "None",
    "defaultResourceName": "Fruits",
    "dataProperties": [
      {
        "nameOnServer": "Name",
        "dataType": "String",
        "isNullable": false,
        "maxLength": 50,
        "validators": [
          {
            "name": "required"
          },
          {
            "maxLength": "50",
            "name": "maxLength"
          }
        ]
      }
    ],
    "navigationProperties": []
  };
  const itemOfProduceType: JsonObj = {
    "shortName": "ItemOfProduce",
    "namespace": "Models.Produce",
    "autoGeneratedKeyType": "None",
    "defaultResourceName": "ItemsOfProduce",
    "dataProperties": [
      {
        "nameOnServer": "Id",
        "dataType": "Int32",
        "isNullable": false,
        "isPartOfKey": true,
        "validators": [
          {
            "name": "required"
          },
          {
            "name": "int32"
          }
        ],
        "custom": makeCustomPropAnnot("Id")
      }
    ],
    "navigationProperties": [],
    "custom": makeCustomTypeAnnot("ItemOfProduce")
  };
  const resourceEntityTypeMap = {
    "Apples": "Apple:#Models.Produce",
    "Fruits": "Fruit:#Models.Produce",
    "ItemsOfProduce": "ItemOfProduce:#Models.Produce"
  };


  const metadataItemFruitApple = {
    "localQueryComparisonOptions": "caseInsensitiveSQL",
    "structuralTypes": [itemOfProduceType, fruitType, appleType],
    "resourceEntityTypeMap": resourceEntityTypeMap
  };
  const metadataAppleFruitItem = {
    "localQueryComparisonOptions": "caseInsensitiveSQL",
    "structuralTypes": [appleType, fruitType, itemOfProduceType],
    "resourceEntityTypeMap": resourceEntityTypeMap
  };
  const metadataFruitAppleItem = {
    "localQueryComparisonOptions": "caseInsensitiveSQL",
    "structuralTypes": [fruitType, appleType, itemOfProduceType],
    "resourceEntityTypeMap": resourceEntityTypeMap
  };


  function makeCustomMetadata(namespace: string) {
    let custKeyName = null;
    if (TestFns.isHibernateServer || TestFns.isSequelizeServer) {
      custKeyName = "customerID"; // server is lower case.
    }

    return {
      "structuralTypes": [
        {
          "shortName": "Customer",
          "namespace": namespace,
          "dataProperties": [
            {
              "nameOnServer": custKeyName || "CustomerID",
              "custom": makeCustomPropAnnot(custKeyName || "customerID")
            },
            {
              "name": "companyName",
              "custom": makeCustomPropAnnot("companyName")
            }
          ],
          "navigationProperties": [
            {
              "name": "orders",
              "custom": makeCustomPropAnnot("orders")
            }
          ],
          "custom": makeCustomTypeAnnot("Customer")
        }
      ]
    };
  }

  function createEmWithTimeGroupMetadata(addFooBar?: any) {

    const dso: JsonObj = {};
    dso.serviceName = TestFns.defaultServiceName;
    dso.hasServerMetadata = false;
    const nc = TestFns.isSequelizeServer ? NamingConvention.none : NamingConvention.camelCase;
    const ds = new DataService(dso);
    const store = new MetadataStore({ namingConvention: nc });
    const emo: JsonObj = {};
    emo.dataService = ds;
    emo.metadataStore = store;
    const manager = new EntityManager(emo);

    if (addFooBar) {
      CodeBase.addEntityMetadata(store);
      FooBar.addEntityMetadata(store);
      TimeGroup.addEntityMetadata(store);
    } else {
      TimeGroup.addEntityMetadata(store);
    }
    return manager;
  }

  class CodeBase {
    
    static addEntityMetadata(store: MetadataStore) {
      
      const eto: JsonObj = {};
      eto.shortName = "CodeBase";
      eto.namespace = TestFns.isNHibernateServer ? "Models.NorthwindIB.NH" : "Foo";
      eto.dataProperties = new Array();
      eto.navigationProperties = new Array();
      eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;

      let dpo: JsonObj = {};
      dpo.name = "id";
      dpo.dataType = breeze.DataType.Int32;
      dpo.isNullable = false;
      dpo.isPartOfKey = true;
      dpo.validators = new Array();

      let dp = new breeze.DataProperty(dpo);
      eto.dataProperties.push(dp);

      let et = new breeze.EntityType(eto);

      et['guid'] = breeze.core.getUuid(); // to see distinct entity types while debugging
      store.addEntityType(et);
    }
  }

  class TimeGroup extends CodeBase {

    static addEntityMetadata(store: MetadataStore) {
      
      let eto: JsonObj = {};
      eto.shortName = "TimeGroup";
      eto.namespace = TestFns.isNHibernateServer ? "Models.NorthwindIB.NH" : "Foo";
      eto.dataProperties = new Array();
      eto.navigationProperties = new Array();
      eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;

      let dpo: JsonObj = {};
      dpo.name = 'id';
      dpo.dataType = breeze.DataType.Int32;
      dpo.isNullable = false;
      dpo.isPartOfKey = true;
      dpo.validators = new Array();

      let dp = new breeze.DataProperty(dpo);
      eto.dataProperties.push(dp);

      dpo = {};
      dpo.name = 'comment';
      dpo.dataType = breeze.DataType.String;
      dpo.isNullable = false;
      dpo.isPartOfKey = false;
      dpo.validators = new Array();

      dp = new breeze.DataProperty(dpo);
      eto.dataProperties.push(dp);

      let npo: JsonObj = {};
      npo.name = "timeLimits";
      npo.associationName = "FK_TimeGroup_TimeLimits";
      npo.validators = new Array();
      npo.isScalar = false;
      npo.entityTypeName = "TimeLimit";

      let np = new NavigationProperty(npo);
      eto.navigationProperties.push(np);

      let et = new EntityType(eto);
      if (TestFns.isODataServer) {
        et.defaultResourceName = "TimeGroups"; // required for resolving batch urls
      }

      et['guid'] = breeze.core.getUuid(); // to see distinct entity types while debugging
      store.addEntityType(et);
    }
  }

  class FooBar extends CodeBase {

    static addEntityMetadata(store: MetadataStore) {
      
      let eto: JsonObj = {};
      eto.shortName = "FooBar";
      eto.namespace = TestFns.isNHibernateServer ? "Models.NorthwindIB.NH" : "Foo";
      eto.dataProperties = new Array();
      eto.navigationProperties = new Array();
      eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;

      let dpo: JsonObj = {};
      dpo.name = "id";
      dpo.dataType = breeze.DataType.Int32;
      dpo.isNullable = false;
      dpo.isPartOfKey = true;
      dpo.validators = new Array();

      let dp = new DataProperty(dpo);
      eto.dataProperties.push(dp);

      dpo = {};
      dpo.name = "comment";
      dpo.dataType = breeze.DataType.String;
      dpo.isNullable = false;
      dpo.isPartOfKey = false;
      dpo.validators = new Array();

      dp = new DataProperty(dpo);
      eto.dataProperties.push(dp);

      let npo: JsonObj = {};
      npo.name = "timeLimits";
      npo.associationName = "FK_TimeGroup_TimeLimits";
      npo.validators = new Array();
      npo.isScalar = false;
      npo.entityTypeName = "TimeLimit";

      let np = new NavigationProperty(npo);
      eto.navigationProperties.push(np);

      let et = new EntityType(eto);

      et['guid'] = breeze.core.getUuid(); // to see distinct entity types while debugging
      store.addEntityType(et);
    }
  }

  

});