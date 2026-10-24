import sys,pandas as pd,numpy as np,warnings;warnings.filterwarnings('ignore')
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
root=sys.argv[1]; ALPHA=float(sys.argv[2]) if len(sys.argv)>2 else 1.0
ef=pd.read_csv(root+'external_factors.csv',parse_dates=['week_start']).set_index('week_start')
CAL=['is_lebaran_week','is_pre_lebaran','is_post_lebaran','is_year_end','is_rainy_season','is_school_holiday','is_payday_week','working_days']
inv=pd.read_csv(root+'invoices.csv',parse_dates=['invoice_date']);ro=pd.read_csv(root+'repair_orders.csv',parse_dates=['scheduled_date']);ro=ro[ro.status!='Cancelled']
weeks=pd.date_range('2024-10-14','2026-09-21',freq='W-MON')
X=ef.reindex(weeks)[CAL].astype(float).copy();X['trend']=np.arange(len(weeks))
if len(sys.argv)>3 and sys.argv[3]=='offset':
    wtl=ef.reindex(weeks)['weeks_to_lebaran']
    for o in [-4,-3,-2,-1,0,1,2]: X[f'leb_off_{o}']=(wtl==o).astype(float)
months=pd.period_range('2025-10','2026-09',freq='M')
dem=ro[ro.quantity_required>0]
day_units=dem.set_index('scheduled_date').quantity_required.resample('D').sum();day_rev=(inv.set_index('invoice_date').total_amount/1e6).resample('D').sum()
wk=lambda s:s.resample('W-MON',label='left',closed='left').sum().reindex(weeks,fill_value=0)
wk_units,wk_rev=wk(day_units),wk(day_rev)
def msum(pw,m):
    return sum(v/7 for w,v in pw.items() for dd in range(7) if (w+pd.Timedelta(days=dd)).to_period('M')==m)
def fc_month(y,m,kind='log'):
    ms=m.start_time;tr=np.where(weeks+pd.Timedelta(days=6)<ms)[0]
    mdl=make_pipeline(StandardScaler(),Ridge(alpha=ALPHA)).fit(X.iloc[tr],np.log1p(y.iloc[tr]) if kind=='log' else y.iloc[tr])
    p=mdl.predict(X);p=np.expm1(p) if kind=='log' else p
    return msum(pd.Series(np.clip(p,0,None),index=weeks),m)
def metrics(a,p):
    a,p=np.array(a,float),np.array(p,float);e=p-a;nz=a>0
    return dict(WAPE=100*np.abs(e).sum()/a.sum(),MAPE=100*np.mean(np.abs(e[nz])/a[nz]),nMAE=100*np.abs(e).mean()/a.mean(),nRMSE=100*np.sqrt((e**2).mean())/a.mean(),Bias=100*e.sum()/a.sum())
rows=[]
# total & pendapatan (bulanan)
for name,wy,dy in [('Total demand bulanan (unit)',wk_units,day_units),('Pendapatan bulanan (Rp juta)',wk_rev,day_rev)]:
    a=[dy[m.start_time:m.end_time].sum() for m in months];p=[fc_month(wy,m) for m in months]
    rows.append((name,)+tuple(metrics(a,p).values()))
# mingguan total demand & pendapatan (walk-forward 1 minggu: latih sebelum minggu uji; fitur kalender diketahui)
for name,wy in [('Total demand mingguan (unit)',wk_units),('Pendapatan mingguan (Rp juta)',wk_rev)]:
    a=[];p=[]
    for i in range(52,len(weeks)):
        mdl=make_pipeline(StandardScaler(),Ridge(alpha=ALPHA)).fit(X.iloc[:i],np.log1p(wy.iloc[:i]));p.append(float(np.expm1(mdl.predict(X.iloc[[i]]))[0]));a.append(wy.iloc[i])
    rows.append((name,)+tuple(metrics(a,p).values()))
# per jenis part & per part_id (bulanan): total x porsi latih
mon_units=dem.assign(m=dem.scheduled_date.dt.to_period('M'))
for name,key in [('Per jenis part bulanan (unit)','vehicle_part'),('Per part_id bulanan (unit)','part_id')]:
    piv=mon_units.groupby([key,'m']).quantity_required.sum().unstack(fill_value=0)
    A=[];P=[]
    for m in months:
        tot_hat=fc_month(wk_units,m);tr=[c for c in piv.columns if c<m]
        sh=piv[tr].sum(1)/piv[tr].sum().sum()
        for k in piv.index: A.append(piv.loc[k,m] if m in piv.columns else 0);P.append(tot_hat*sh[k])
    rows.append((name,)+tuple(metrics(A,P).values()))
df=pd.DataFrame(rows,columns=['Level','WAPE_%','MAPE_%','nMAE_%','nRMSE_%','Bias_%']);print(df.round(1).to_string(index=False))
