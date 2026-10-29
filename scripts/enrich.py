import json,pathlib
p=pathlib.Path(__file__).resolve().parents[1]; data=json.loads((p/'dist/data.json').read_text()); research=json.loads((p/'research-sources.json').read_text())
for c in data:
 r=next((r for r in research['countries'] if r['id']==c['id']),None)
 if r: c.update(verified=True,entry=r['entry'],longStay=r['sevenMonths'],residence=r['residence'],sources=r['sources'],confidence=r.get('confidence','Проверены перечисленные официальные страницы; решение принимают уполномоченные органы.'),official=r['sources'][0]['url'])
 c['visaFree']=c['id'] in ['georgia','thailand','vietnam','armenia','serbia','kazakhstan','turkey']
 c['longType']='free' if c['id']=='georgia' else ('conditional' if c['verified'] and c['id']!='vietnam' else 'unknown')
 c['difficulty']={'georgia':1,'armenia':2,'serbia':2,'thailand':2,'kazakhstan':2,'turkey':4,'vietnam':4,'indonesia':3,'portugal':4,'poland':5}.get(c['id'],0)
 c['climate']='tropical' if c['region'] in ['ЮВА','Южная Азия'] and c['id']!='nepal' or c['id'] in ['mauritius','brazil','colombia','panama','costarica'] else ('cold' if c['id'] in ['canada','finland','mongolia','kazakhstan'] else 'temperate')
 c['english']=c['id'] in ['malaysia','philippines','india','uae','uk','usa','canada','australia','newzealand','southafrica','mauritius']
 c['rentalChecks']=[r for r in research['rentalChecks'] if r['country']==c['name']]
 c['citizenship']='Срок и условия натурализации не проверены. Наличие ВНЖ не означает автоматического права на паспорт.'
 c['citizenYears']=None
 c['social']='Репрезентативных сопоставимых данных о бытовом отношении к россиянам нет. Опыт зависит от города, языка и обстоятельств. Проверяйте правила въезда и банков отдельно; паспорт не предсказывает поведение отдельных людей.'
 if c['id']=='poland': c['social']='Подтверждены ограничения въезда по гражданству РФ и категориям исключений. Это юридическое ограничение, а не оценка отношения всех жителей. См. Пограничную службу в источниках.'
 if c['id']=='georgia': c['social']='Политический контекст чувствителен. Оценка «к россиянам относятся плохо» не подтверждена репрезентативными данными в этой проверке. Уважайте местный язык и не делайте выводы по отдельным историям.'
 if c['id']=='kazakhstan': c['social']='Русский широко используется, но это не гарантирует одинаковый опыт общения. Оснований присваивать всей стране оценку «плохое отношение к россиянам» в проверенных источниках нет.'
 if not c.get('sources'): c['sources']=[]
 for city in c['cities']:
  city['housing']=c['housing']; city['costSource']='Редакционный сценарий бюджета, не замер рынка. Погрешность может превышать 30%; цены зависят от района, сезона и договора.'
  city['features']=' · '.join({'sea':'побережье','beach':'пляжи','work':'кафе и рабочие пространства','malls':'торговые центры','clubs':'игровая инфраструктура','mountains':'горы','metro':'метро'}[t] for t in city['tags'])
# Verified naturalization summaries; eligibility is not guaranteed approval.
for id,years,text,url in [
 ('georgia',10,'Обычная процедура: 10 лет законного непрерывного проживания, экзамены по языку, истории и праву, а также экономическая связь. Есть отдельные семейные и другие основания.','https://sda.gov.ge/en/products/citizenship/'),
 ('armenia',3,'Общий маршрут: последние 3 года законного проживания, знание армянского языка и Конституции. Есть специальные основания. С 2026 года заявления проходят через электронную систему; решение не автоматическое.','https://english.hartak.am/services/a0404bc3-4dc9-4602-bbd5-0a372ff69cfa/online/'),
 ('serbia',None,'Обычный приём требует ПМЖ, не менее 3 лет зарегистрированного постоянного проживания и обычно выхода из прежнего гражданства либо подтверждения такого выхода. Три года временного ВНЖ — не срок до паспорта.','https://www.msp.gov.rs/gradjani/usluge/drzavljanstvo'),
 ('uruguay',5,'Юридическое гражданство: обычно 5 лет обычного проживания или 3 года с семьёй в стране, средства к существованию и доказательства связи со страной. Гражданство и национальность имеют особенности; проверяйте последствия отдельно.','https://www.gub.uy/tramites/carta-ciudadania')]:
 c=next(c for c in data if c['id']==id); c['citizenship']=text;c['citizenYears']=years;c['sources'].append(dict(title='Официальные условия гражданства',url=url))
extra=[dict(portal='DDproperty',country='Таиланд',city='Чиангмай',checked=True,url='https://www.ddproperty.com/en/condo-for-rent/in-chiang-mai-th50',samples=[dict(price=17000,currency='THB',area=45,rooms='1 bedroom',description='Hill Side Plaza and Condominium, Chang Phuak; цена из выдачи',url='https://www.ddproperty.com/en/condo-for-rent/in-chiang-mai-th50')],note='Просмотрена выдача 30.10.2026. Это один пример, не средняя цена. Наличие не подтверждено.'),dict(portal='Batdongsan',country='Вьетнам',city='Дананг',checked=True,url='https://batdongsan.com.vn/cho-thue-can-ho-chung-cu-da-nang',samples=[dict(price=16000000,currency='VND',area=50,rooms='1 bedroom',description='Sun Symphony: 1 спальня, меблированная; цена из выдачи',url='https://batdongsan.com.vn/cho-thue-can-ho-chung-cu-da-nang')],note='Выдача просмотрена 30.10.2026. Пример предложения, не средняя цена всего города; объявление может быть снято.')]
for c in data: c['rentalChecks']+= [r for r in extra if r['country']==c['name']]
(p/'dist/data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
(p/'dist/research.json').write_text(json.dumps(research,ensure_ascii=False,indent=2))
