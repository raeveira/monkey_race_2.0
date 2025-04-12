import z from 'zod';

export const LoginForm = z.object({
    email: z.string().email({
        message: 'Please enter a valid email address'
    }).nonempty({
        message: 'Please enter your email address'
    }),
    password: z.string().nonempty({
        message: 'Please enter your password'
    })
});