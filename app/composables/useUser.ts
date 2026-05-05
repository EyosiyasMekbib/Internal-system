export const useUser = () => {
  return useState('user', () => null as null | { id: string; email: string; name: string })
}