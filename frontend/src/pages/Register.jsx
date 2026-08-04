import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";

const Register = () => {
    const navigate = useNavigate();

    // 1. Set up the exact same validation rules as the backend
    const validationSchema = Yup.object().shape({
        username: Yup.string().required("Username is required"),
        password: Yup.string()
            .matches(
                /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
                "Must be 8+ chars, with at least 1 letter and 1 number"
            )
            .required("Password is required"),
        name: Yup.string().required("Full name is required"),
        email: Yup.string().email("Invalid email").required("Email is required"),
        gender: Yup.string().required("Please select a gender"),
        phone_number: Yup.string(),
        company_university: Yup.string(),
        primary_language: Yup.string()
    });

    const onSubmit = async (values, { setSubmitting, setFieldError }) => {
        try {
            const response = await fetch('http://localhost:3001/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });

            const result = await response.json();

            if (response.ok) {
                alert("Account created successfully! Please log in.");
                navigate('/login');
            } else {
                // Route backend errors to the specific input fields if possible
                const errorText = result.error.toLowerCase();
                if (errorText.includes('email')) {
                    setFieldError('email', result.error);
                } else if (errorText.includes('username')) {
                    setFieldError('username', result.error);
                } else {
                    alert(result.error || 'Registration failed');
                }
            }
        } catch (err) {
            alert('Could not connect to the server.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="form-container form-container--wide">
            <h2>Join StackUnderflow</h2>

            <Formik
                initialValues={{
                    username: '', password: '', name: '', email: '',
                    gender: 'Prefer not to say', phone_number: '',
                    company_university: '', primary_language: ''
                }}
                validationSchema={validationSchema}
                onSubmit={onSubmit}
            >
                {({ isSubmitting }) => (
                    <Form className="auth-form">

                        {/* 1. Account Credentials */}
                        <div className="form-row-2">
                            <div className="input-group">
                                <label>Username (ID) *</label>
                                <Field type="text" name="username" />
                                <ErrorMessage name="username" component="span" className="error-text" />
                            </div>
                            <div className="input-group">
                                <label>Password *</label>
                                <Field type="password" name="password" />
                                <ErrorMessage name="password" component="span" className="error-text" />
                            </div>
                        </div>

                        {/* 2. Core Identity */}
                        <div className="input-group">
                            <label>Full Name *</label>
                            <Field type="text" name="name" />
                            <ErrorMessage name="name" component="span" className="error-text" />
                        </div>

                        <div className="form-row-2">
                            <div className="input-group">
                                <label>Email Address *</label>
                                <Field type="email" name="email" />
                                <ErrorMessage name="email" component="span" className="error-text" />
                            </div>
                            <div className="input-group">
                                <label>Gender *</label>
                                <Field as="select" name="gender" className="select-input">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </Field>
                            </div>
                        </div>

                        {/* 3. Professional Details */}
                        <div className="form-row-2">
                            <div className="input-group">
                                <label>Phone Number</label>
                                <Field type="tel" name="phone_number" placeholder="+880..." />
                            </div>
                            <div className="input-group">
                                <label>Primary Language</label>
                                <Field type="text" name="primary_language" placeholder="e.g., JavaScript" />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Company / University</label>
                            <Field type="text" name="company_university" placeholder="Where do you study or work?" />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default Register;
