// testFns.skipIf("mongo,sequelize,hibernate,aspcore", "does not support the 'add' OData predicate").
import { breeze, EntityManager, EntityQuery, NamingConvention, Predicate, EntityType, EntityState, EntityKey, Entity, MetadataStore } from 'breeze-client';
import { TestFns, expectPass, describeIf } from './test-fns';


TestFns.initServerEnv();

beforeAll( async() => {
  await TestFns.initDefaultMetadataStore();
});

describeIf(TestFns.isODataServer, "OData specific", () => {

  beforeEach(function () {

  });
  
  test("OData predicate - add ", async() => {
    expect.assertions(1);
    const em1 = TestFns.newEntityManager();
    const query = EntityQuery
      .from("Employees")
      .where("EmployeeID add ReportsToEmployeeID gt 3");

    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
    try {
      em1.executeQueryLocally(query);
      throw new Error("should not get here");
    } catch (e) {
      expectPass();
    }
  });


  test("raw OData query string", async() => {
    expect.assertions(2);
    const em1 = TestFns.newEntityManager();
    const qr1 = await em1.executeQuery("Customers?&$top=3");
    const custs = qr1.results;
    expect(custs.length).toBeGreaterThan(0);
    const isOk = custs.every( c => c.entityType.shortName === "Customer");
    expect(isOk).toBe(true);
  });


  test("OData predicate - add combined with regular predicate", async() => {
    expect.assertions(2);
    const em1 = TestFns.newEntityManager();
    const predicate = Predicate.create("EmployeeID add ReportsToEmployeeID gt 3").and("employeeID", "<", 9999);
    const query = EntityQuery
      .from("Employees")
      .where(predicate);
    const qr1 = await em1.executeQuery(query);
    expect(qr1.results.length).toBeGreaterThan(0);
    try {
      em1.executeQueryLocally(query);
      throw new Error("should not get here");
    } catch (e) {
      expectPass();
    }

  });


  // function configureMetadata(metadataFetchedArgs: MetadataFetchedEventArgs) {
  //   var ms = metadataFetchedArgs.metadataStore;
  //   var dataService = metadataFetchedArgs.dataService;

  //   if (testFns.DEBUG_ODATA) {
  //     if (testFns.DEBUG_ODATA_VERSION == 'odata') {
  //       var entityType, complexType, np, dp;

  //       entityType = ms.getEntityType("Customer");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
  //       dp = entityType.getDataProperty("companyName");
  //       dp.validators.push(Validator.maxLength({ maxLength: 40 }));

  //       entityType = ms.getEntityType("Employee");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
  //       np = entityType.getNavigationProperty("manager"); // inv: employee.directReports
  //       np.setProperties({ foreignKeyNames: ["reportsToEmployeeID"], inverse: "directReports" });
  //       dp = entityType.getDataProperty("lastName");
  //       dp.validators.push(Validator.maxLength({ maxLength: 30 }));


  //       entityType = ms.getEntityType("Order");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
  //       np = entityType.getNavigationProperty("customer"); // inv: customer.orders
  //       np.setProperties({ foreignKeyNames: ["customerID"] });
  //       np.setInverse("orders");
  //       np = entityType.getNavigationProperty("employee"); // inv: employee.orders
  //       np.setProperties({ foreignKeyNames: ["employeeID"], inverse: "orders" });

  //       entityType = ms.getEntityType("InternationalOrder");
  //       np = entityType.getNavigationProperty("order");
  //       np.setProperties({ foreignKeyNames: ["orderID"], inverse: "internationalOrder" });

  //       entityType = ms.getEntityType("OrderDetail");
  //       np = entityType.getNavigationProperty("order"); // inv: order.orderDetails
  //       np.setProperties({ foreignKeyNames: ["orderID"], inverse: "orderDetails" });
  //       np = entityType.getNavigationProperty("product"); // inv: [none]
  //       np.setProperties({ foreignKeyNames: ["productID"] });

  //       entityType = ms.getEntityType("Product");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       entityType = ms.getEntityType("Category");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       entityType = ms.getEntityType("Supplier");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
  //       dp = entityType.getDataProperty("companyName");
  //       dp.validators.push(Validator.maxLength({ maxLength: 30 }));

  //       entityType = ms.getEntityType("Role");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       entityType = ms.getEntityType("User");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });
  //       dp = entityType.getDataProperty("createdDate");
  //       dp.defaultValue = new Date(); // odata metadata doesn't contain the default value
  //       dp = entityType.getDataProperty("modifiedDate");
  //       dp.defaultValue = new Date();

  //       entityType = ms.getEntityType("UserRole");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       entityType = ms.getEntityType("TimeLimit");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       entityType = ms.getEntityType("TimeGroup");
  //       entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       //entityType = ms.getEntityType("Geospatial");
  //       //entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       //entityType = ms.getEntityType("UnusualDate");
  //       //entityType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.Identity });

  //       complexType = ms.getEntityType("Location");
  //       dp = complexType.getProperty("city");
  //       dp.validators.push(Validator.maxLength({ maxLength: 15 }));


  //     } else if (testFns.DEBUG_ODATA_VERSION == "odata-wcf") {
  //       if (dataService.serviceName.indexOf("Inheritance") === -1) {
  //         var regionType = ms.getEntityType("Region");
  //         regionType.setProperties({ autoGeneratedKeyType: AutoGeneratedKeyType.KeyGenerator });

  //         setIdentityProp(ms, "Product");
  //         setIdentityProp(ms, "Category");
  //         setIdentityProp(ms, "Employee");
  //         //setIdentityProp(ms, "EmployeeTerritory");
  //         setIdentityProp(ms, "Customer");
  //         setIdentityProp(ms, "Order");
  //         setIdentityProp(ms, "Role");
  //         setIdentityProp(ms, "Supplier");
  //         setIdentityProp(ms, "User");
  //         setIdentityProp(ms, "UserRole");

  //       }
  //     }
  //   }
  // };

  // test("predicateBuilder simple toOData()", function () {
  //   const ms = new MetadataStore();
  //   const nullEt = new EntityType(ms);
  //   const config = { entityType: nullEt }
  //   const dt = new Date(88, 9, 12);
  //   const dateStr = dt.toISOString(dt);
  //   const p = Predicate.create("OrderDate", ">", dt);
  //   const txt = p.toODataFragment(config);
  //   equal(txt, "OrderDate gt datetime'" + dateStr + "'");
  //   const p2 = Predicate.create("OrderDate", "gt", dt);
  //   const txt2 = p2.toODataFragment(config);
  //   equal(txt2, "OrderDate gt datetime'" + dateStr + "'");
  //   const p3 = Predicate.create("OrderDate", "==", dt);
  //   const txt3 = p3.toODataFragment(config);
  //   equal(txt3, "OrderDate eq datetime'" + dateStr + "'");
  //   const p4 = new Predicate("OrderDate", "ne", dt);
  //   const txt4 = p4.toODataFragment(config);
  //   equal(txt4, "OrderDate ne datetime'" + dateStr + "'");
  //   const p5 = new Predicate("ShipCity", "stArtsWiTH", "C");
  //   const txt5 = p5.toODataFragment(config);
  //   equal(txt5, "startswith(ShipCity,'C') eq true");
  // });
});