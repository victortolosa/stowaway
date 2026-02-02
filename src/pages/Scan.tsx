import { useNavigate } from 'react-router-dom'
import { QRScanner } from '@/components/QRScanner'

export function Scan() {
    const navigate = useNavigate()

    const handleScan = (containerId: string) => {
        // Navigate to the container page
        navigate(`/containers/${containerId}`)
    }

    const handleClose = () => {
        navigate('/dashboard')
    }

    return (
        <QRScanner
            onScan={handleScan}
            onClose={handleClose}
        />
    )
}
