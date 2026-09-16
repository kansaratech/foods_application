import BannerEditor from '@/lib/ui/screens/super-admin/management/banners/editor';
export default function Page({ params }: { params: { id: string } }) {
  return <BannerEditor id={params.id} />;
}
