import { useTranslation } from 'react-i18next';
import { Accordion, Card } from 'react-bootstrap';


export const HelpExtensionTitle = () => {
    const { t } = useTranslation();
    return (
        <>
            <h3>
                {t('help.extension-help.title')}
            </h3>
        </>
    )
}

export const HelpExtension = () => {
    const { t } = useTranslation();
    const topics = [
        'general',
        'geonames',
        'weather',
    ]

    return (
        <> {
            topics.map((topic) => {
                return (
                    <Accordion className='help-accordion' >
                        <Card>
                            <Card.Header>
                                <Accordion.Toggle eventKey="0">
                                    <h4>
                                        {t('help.extension-help.topics.' + topic + '.title')}
                                    </h4>
                                </Accordion.Toggle>
                            </Card.Header>
                            <Accordion.Collapse eventKey="0">
                                <Card.Body>
                                    <p>{t('help.extension-help.topics.' + topic + '.content')}
                                    </p>
                                </Card.Body>
                            </Accordion.Collapse>
                        </Card>
                    </Accordion>
                )
            })
        }
        </>
    )
}