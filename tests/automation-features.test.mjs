import test from 'node:test';
import assert from 'node:assert/strict';
import { host } from './hooks-host.mjs';

function automationHost(){
  const h=host();
  for(const file of ['CE_autoFarm.js','CE_manorHelper.js','CE_safehouseCheat.js','CE_teleportation.js'])h.load('scripts/'+file);
  return h;
}

test('farm, manor and safehouse retain native state fields and release only their page callbacks',()=>{
  const h=automationHost(),{c}=h;
  c.setup.foodstuff={test:{tending:{has_seeds:true}}};
  Object.assign(c.V,{CE_autoFarm:true,CE_autoFarmToast:false,CE_manorClean:true,avery_mansion:{lounge:2},CE_autoWater:true,CE_edenOutdoorLock:true,
    plots:{garden:[{plant:'none',stage:0,water:0}]}});
  h.emit(':passagestart');
  assert.equal(c.V.avery_mansion.lounge,0);assert.equal(c.V.plots.garden[0].water,1);assert.equal(c.V.edengarden,4);
  for(const id of ['farm-automation','manor-automation','safehouse-automation'])c.setup.CE_features.disable(id);
  c.V.avery_mansion.lounge=2;c.V.plots.garden[0].water=0;c.V.edengarden=1;
  h.emit(':passagestart');
  assert.equal(c.V.avery_mansion.lounge,2);assert.equal(c.V.plots.garden[0].water,0);assert.equal(c.V.edengarden,1);
  for(const id of ['farm-automation','manor-automation','safehouse-automation'])c.setup.CE_features.enable(id);
  h.emit(':passagestart');assert.equal(c.V.avery_mansion.lounge,0);assert.equal(c.V.plots.garden[0].water,1);
});

test('teleport keeps legacy node migration, native scene guard and data while its page updater is released',()=>{
  const h=automationHost(),{c}=h;
  c.V.teleportation=['◁[[home|Bedroom]]▷'];c.V.teleportation_name=['home'];h.emit(':passagestart');
  const node=c.V.teleportation_db[0];assert.equal(node.passage,'Bedroom');
  c.V.passage='Clothing Shop';assert.equal(c.setup.CE_TeleportationManager.canTeleport(),false);
  c.V.passage='Bedroom';assert.equal(c.setup.CE_TeleportationManager.canTeleport(),true);
  c.setup.CE_features.disable('teleport-store');const db=c.V.teleportation_db;h.emit(':passagestart');
  assert.equal(c.V.teleportation_db,db);assert.equal(db[0].id,node.id);
  c.setup.CE_features.enable('teleport-store');h.emit(':passagestart');
  assert.equal(c.V.teleportation_db[0].id,node.id);assert.equal(c.V.teleportation_name[0],'home');
});

test('vending, cafe and Yanling retain original state initialization while releasing their page callbacks',()=>{
  const h=host(),{c}=h;
  for(const file of ['CE_brothelVending.js','CE_cafeBunCheat.js','CE_YanLinManager.js'])h.load('scripts/'+file);
  c.V.CE_vendingRestock=true;c.V.brothelVending={status:'set',condoms:1,lube:2};
  h.emit(':passageinit');h.emit(':passagestart');
  assert.equal(c.V.brothelVending.condoms,200);assert.equal(typeof c.V.CE_cafeBunCheat,'object');
  const fields=Object.keys(c.V).filter(k=>k.toLowerCase().includes('yanling'));
  assert.ok(fields.length>0);
  for(const id of ['vending-restock','cafe-settings','yanling-store'])c.setup.CE_features.disable(id);
  c.V.brothelVending.condoms=1;delete c.V.CE_cafeBunCheat;h.emit(':passageinit');h.emit(':passagestart');
  assert.equal(c.V.brothelVending.condoms,1);assert.equal(c.V.CE_cafeBunCheat,undefined);
  for(const id of ['vending-restock','cafe-settings','yanling-store'])c.setup.CE_features.enable(id);
  h.emit(':passageinit');h.emit(':passagestart');
  assert.equal(c.V.brothelVending.condoms,200);assert.equal(typeof c.V.CE_cafeBunCheat,'object');
});
