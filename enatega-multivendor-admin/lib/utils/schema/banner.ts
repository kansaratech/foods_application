import * as Yup from 'yup';

export const BannerSchema = Yup.object().shape({
  title: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .required('Required'),
  description: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .required('Required'),
  action: Yup.object()
    .shape({
      label: Yup.string().required('Required'),
      code: Yup.string().required('Required'),
    })
    .required('Required'),
  screen: Yup.object()
    .shape({
      label: Yup.string().required('Required'),
      code: Yup.string().required('Required'),
    })
    .required('Required'),
  file: Yup.string().required('Required'),
  placement: Yup.object()
    .shape({
      label: Yup.string().required('Required'),
      code: Yup.string().required('Required'),
    })
    .required('Required'),
  priority: Yup.number().min(0, 'Must be zero or more').required('Required'),
  couponCode: Yup.string().max(35).trim(),
  startDate: Yup.string(),
  endDate: Yup.string().test(
    'after-start',
    'End date must be after the start date',
    function (value) {
      const { startDate } = this.parent;
      if (!value || !startDate) return true;
      return new Date(value) >= new Date(startDate);
    }
  ),
});
