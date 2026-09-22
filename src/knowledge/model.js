const SOURCE_RANK={live:1.0,curated:0.9,memory:0.6,analytics:0.5,unknown:0};
function evidence(source, value, observedAt=new Date().toISOString(), quality=.5, freshnessSeconds=null){return {source,value,observedAt,quality,rank:SOURCE_RANK[source]??0,freshnessSeconds};}
function chooseBest(facts){return [...facts].sort((a,b)=>{const ar=(a.rank??0)*(a.quality??0);const br=(b.rank??0)*(b.quality??0);return br-ar})[0]||null;}
module.exports={SOURCE_RANK,evidence,chooseBest};
