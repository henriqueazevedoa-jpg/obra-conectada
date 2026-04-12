import dashboardMock from '@/assets/dashboard-mock.jpg';
import paymentsMock from '@/assets/payments-mock.jpg';
import cronogramaMock from '@/assets/cronograma-mock.jpg';

const demos = [
  { img: dashboardMock, label: 'Dashboard com visão geral' },
  { img: paymentsMock, label: 'Lista de pagamentos organizada' },
  { img: cronogramaMock, label: 'Cronograma físico da obra' },
];

export default function DemoSection() {
  return (
    <section className="py-16 px-4 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Você entende sua obra em minutos</h2>
        <p className="text-center text-muted-foreground mb-10">Veja como o sistema organiza cada aspecto da sua obra</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {demos.map((item, i) => (
            <div key={i} className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border shadow-sm">
                <img src={item.img} alt={item.label} loading="lazy" width={1280} height={800} className="w-full h-auto" />
              </div>
              <p className="text-sm font-medium text-center">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
